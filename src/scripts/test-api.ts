import { Server } from 'http';
import { createApp } from '../app';
import { prisma } from '../config/database';

interface ApiResponse<T = any> {
  status: number;
  data: T;
}

async function request(
  baseUrl: string,
  method: string,
  path: string,
  body?: any
): Promise<ApiResponse> {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // Non-JSON response
  }
  return { status: res.status, data };
}

let server: Server;
const PORT = 3099;
const BASE_URL = `http://localhost:${PORT}`;

function assert(condition: boolean, desc: string) {
  if (!condition) {
    console.error(`FAILED: ${desc}`);
    throw new Error(`Assertion failed: ${desc}`);
  }
  console.log(`  ok - ${desc}`);
}

async function runTests() {
  console.log('Running API integration tests...\n');

  const app = createApp();
  await new Promise<void>((resolve) => {
    server = app.listen(PORT, () => resolve());
  });

  try {
    console.log('# Health check');
    const health = await request(BASE_URL, 'GET', '/health');
    assert(health.status === 200, 'Health endpoint responds with 200');
    assert(health.data.services.postgres === 'connected', 'PostgreSQL is connected');
    assert(health.data.services.firestore === 'connected', 'Firestore is connected');

    console.log('\n# Setup: create test users');
    const u1 = await request(BASE_URL, 'POST', '/user/create', {
      name: 'User One',
      email: `u1_${Date.now()}@example.com`,
    });
    assert(u1.status === 201, 'User 1 created');
    const user1Id = u1.data.id;

    const u2 = await request(BASE_URL, 'POST', '/user/create', {
      name: 'User Two',
      email: `u2_${Date.now()}@example.com`,
    });
    assert(u2.status === 201, 'User 2 created');
    const user2Id = u2.data.id;

    const u3 = await request(BASE_URL, 'POST', '/user/create', {
      name: 'User Three',
      email: `u3_${Date.now()}@example.com`,
    });
    assert(u3.status === 201, 'User 3 created');
    const user3Id = u3.data.id;

    console.log('\n# 1. Create or get chat');
    const chat1 = await request(BASE_URL, 'POST', '/chat/create', {
      userAId: user1Id,
      userBId: user2Id,
    });
    assert(chat1.status === 201, 'Chat created with 201 status');
    assert(Boolean(chat1.data.chatId), 'chatId is present in response');
    assert(chat1.data.isNew === true, 'isNew is true on first creation');
    const chatId = chat1.data.chatId;

    // Call again with reversed arguments to verify canonical deduplication
    const chat1Dup = await request(BASE_URL, 'POST', '/chat/create', {
      userAId: user2Id,
      userBId: user1Id,
    });
    assert(chat1Dup.status === 200, 'Duplicate creation returns 200');
    assert(chat1Dup.data.chatId === chatId, 'Existing chatId returned');
    assert(chat1Dup.data.isNew === false, 'isNew is false on duplicate call');

    // Self chat check
    const selfChat = await request(BASE_URL, 'POST', '/chat/create', {
      userAId: user1Id,
      userBId: user1Id,
    });
    assert(selfChat.status === 400, 'Self-chat returns 400 Bad Request');

    console.log('\n# 2. Send message');
    const msg1 = await request(BASE_URL, 'POST', `/chat/${chatId}/message/send`, {
      senderId: user1Id,
      text: 'First test message',
    });
    assert(msg1.status === 201, 'Message 1 sent');
    assert(Boolean(msg1.data.messageId), 'messageId present');
    assert(msg1.data.text === 'First test message', 'Text matches payload');
    const msg1Id = msg1.data.messageId;

    await new Promise((r) => setTimeout(r, 150));

    const msg2 = await request(BASE_URL, 'POST', `/chat/${chatId}/message/send`, {
      senderId: user2Id,
      text: 'Second test message',
    });
    assert(msg2.status === 201, 'Message 2 sent');
    const msg2Id = msg2.data.messageId;

    // Non-member authorization check
    const intruder = await request(BASE_URL, 'POST', `/chat/${chatId}/message/send`, {
      senderId: user3Id,
      text: 'Unauthorized send',
    });
    assert(intruder.status === 403, 'Non-member sending message is forbidden (403)');

    // Empty text check
    const emptyMsg = await request(BASE_URL, 'POST', `/chat/${chatId}/message/send`, {
      senderId: user1Id,
      text: '   ',
    });
    assert(emptyMsg.status === 400, 'Empty text rejected with 400');

    console.log('\n# 3. Get messages');
    const getRes = await request(
      BASE_URL,
      'GET',
      `/chat/${chatId}/messages?limit=50&userId=${user1Id}`
    );
    assert(getRes.status === 200, 'Get messages returns 200');
    assert(Array.isArray(getRes.data.messages), 'messages is an array');
    assert(getRes.data.messages.length >= 2, 'Returns both messages');
    assert(getRes.data.messages[0].messageId === msg1Id, 'Messages are ordered chronologically');

    console.log('\n# 4. Mark message read');
    const readRes = await request(
      BASE_URL,
      'POST',
      `/chat/${chatId}/message/${msg1Id}/read`,
      { userId: user2Id }
    );
    assert(readRes.status === 200, 'Read receipt created (200)');
    assert(readRes.data.messageId === msg1Id, 'messageId matches');

    const intruderRead = await request(
      BASE_URL,
      'POST',
      `/chat/${chatId}/message/${msg1Id}/read`,
      { userId: user3Id }
    );
    assert(intruderRead.status === 403, 'Non-member marking read is forbidden');

    console.log('\n# 5. Update last seen');
    const lastSeenRes = await request(BASE_URL, 'POST', `/chat/${chatId}/lastseen`, {
      userId: user2Id,
      messageId: msg2Id,
    });
    assert(lastSeenRes.status === 200, 'Last seen updated to latest message');

    // Attempt moving backwards to msg1
    const backwardAttempt = await request(BASE_URL, 'POST', `/chat/${chatId}/lastseen`, {
      userId: user2Id,
      messageId: msg1Id,
    });
    assert(backwardAttempt.status === 400, 'Moving cursor backward rejected with 400');

    console.log('\n# 6. List user chats');
    const userChats = await request(BASE_URL, 'GET', `/user/${user1Id}/chats`);
    assert(userChats.status === 200, 'List chats returns 200');
    assert(Array.isArray(userChats.data.chats), 'chats is an array');
    const currentChat = userChats.data.chats.find((c: any) => c.chatId === chatId);
    assert(Boolean(currentChat), 'Chat exists in user chat list');
    assert(currentChat.memberIds.length === 2, 'Includes all member IDs');

    console.log('\n# Bonus: Group chat & message edit/delete');
    const groupRes = await request(BASE_URL, 'POST', '/chat/group/create', {
      creatorId: user1Id,
      name: 'Engineering Team',
      memberIds: [user2Id, user3Id],
    });
    assert(groupRes.status === 201, 'Group chat created');
    const groupChatId = groupRes.data.chatId;

    const groupMsg = await request(
      BASE_URL,
      'POST',
      `/chat/${groupChatId}/message/send`,
      { senderId: user3Id, text: 'Hello team' }
    );
    assert(groupMsg.status === 201, 'Message sent in group chat');
    const groupMsgId = groupMsg.data.messageId;

    const editRes = await request(
      BASE_URL,
      'PUT',
      `/chat/${groupChatId}/message/${groupMsgId}`,
      { userId: user3Id, text: 'Hello team (edited)' }
    );
    assert(editRes.status === 200, 'Message edited');

    const deleteRes = await request(
      BASE_URL,
      'DELETE',
      `/chat/${groupChatId}/message/${groupMsgId}`,
      { userId: user3Id }
    );
    assert(deleteRes.status === 200, 'Message soft-deleted');

    console.log('\nAll integration tests completed successfully.');
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

runTests().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
