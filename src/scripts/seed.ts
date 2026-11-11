import { prisma } from '../config/database';
import { ChatService } from '../services/chat.service';
import { MessageService } from '../services/message.service';

async function main() {
  console.log('Seeding initial database data...');

  const usersData = [
    { name: 'Alice Smith', email: 'alice@example.com' },
    { name: 'Bob Jones', email: 'bob@example.com' },
    { name: 'Charlie Brown', email: 'charlie@example.com' },
    { name: 'Diana Prince', email: 'diana@example.com' },
  ];

  const users: Record<string, string> = {};

  for (const u of usersData) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name },
      create: u,
    });
    users[u.email] = user.id;
    console.log(`User created/updated: ${user.name} (${user.id})`);
  }

  const aliceId = users['alice@example.com']!;
  const bobId = users['bob@example.com']!;
  const charlieId = users['charlie@example.com']!;

  // 1:1 direct chat
  const directChat = await ChatService.createOrGetDirectChat(aliceId, bobId);
  console.log(`Direct chat between Alice and Bob: ${directChat.chatId} (new: ${directChat.isNew})`);

  // Sample messages in direct chat
  const msg1 = await MessageService.sendMessage(
    directChat.chatId,
    aliceId,
    'Hey Bob, sending a message via the new backend.'
  );
  console.log(`Message 1 sent: ${msg1.messageId}`);

  const msg2 = await MessageService.sendMessage(
    directChat.chatId,
    bobId,
    'Got it Alice! Stored in Firestore.'
  );
  console.log(`Message 2 sent: ${msg2.messageId}`);

  // Read receipt & last seen
  await MessageService.markMessageRead(directChat.chatId, msg1.messageId, bobId);
  await MessageService.updateLastSeen(directChat.chatId, bobId, msg1.messageId);
  console.log('Read receipt and last seen updated for Bob.');

  // Group chat
  const group = await ChatService.createGroupChat(
    aliceId,
    'Project Engineering Team',
    [bobId, charlieId]
  );
  console.log(`Group chat created: "${group.name}" (${group.chatId})`);

  await MessageService.sendMessage(
    group.chatId,
    aliceId,
    'Welcome to the team group chat!'
  );

  console.log('Seed completed successfully.');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
