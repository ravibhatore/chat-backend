import { FieldValue, firestore, Timestamp } from '../config/firebase';
import { Timestamp as FirestoreTimestamp } from 'firebase-admin/firestore';
import { BadRequestError, ForbiddenError, NotFoundError } from '../utils/errors';
import { ChatService } from './chat.service';

export class MessageService {
  static async sendMessage(chatId: string, senderId: string, text: string) {
    const trimmed = text.trim();
    if (!trimmed) {
      throw new BadRequestError('Message cannot be empty');
    }

    await ChatService.verifyMembership(chatId, senderId);

    const messagesRef = firestore.collection('chats').doc(chatId).collection('messages');
    const doc = messagesRef.doc();
    const now = Timestamp.now();

    await doc.set({
      senderId,
      text: trimmed,
      createdAt: FieldValue.serverTimestamp(),
      isDeleted: false,
      isEdited: false,
    });

    return {
      messageId: doc.id,
      chatId,
      senderId,
      text: trimmed,
      createdAt: now.toDate().toISOString(),
    };
  }

  static async getMessages(
    chatId: string,
    limit = 50,
    cursor?: string,
    userId?: string
  ) {
    if (userId) {
      await ChatService.verifyMembership(chatId, userId);
    }

    const pageSize = Math.min(Math.max(limit, 1), 100);

    let query = firestore
      .collection('chats')
      .doc(chatId)
      .collection('messages')
      .orderBy('createdAt', 'asc');

    if (cursor) {
      const cursorDoc = await firestore
        .collection('chats')
        .doc(chatId)
        .collection('messages')
        .doc(cursor)
        .get();

      if (!cursorDoc.exists) {
        throw new BadRequestError(`Cursor message ${cursor} not found`);
      }

      query = query.startAfter(cursorDoc);
    }

    const snapshot = await query.limit(pageSize + 1).get();
    const hasMore = snapshot.docs.length > pageSize;
    const docs = hasMore ? snapshot.docs.slice(0, pageSize) : snapshot.docs;

    const messages = docs.map((doc) => {
      const data = doc.data();
      const createdAt = data['createdAt']?.toDate?.() ?? new Date();
      const updatedAt = data['updatedAt']?.toDate?.();

      return {
        messageId: doc.id,
        chatId,
        senderId: data['senderId'] ?? '',
        text: data['isDeleted'] ? 'This message was deleted' : data['text'] ?? '',
        isDeleted: data['isDeleted'] ?? false,
        isEdited: data['isEdited'] ?? false,
        createdAt: createdAt.toISOString(),
        ...(updatedAt && { updatedAt: updatedAt.toISOString() }),
      };
    });

    const nextCursor = hasMore && docs.length > 0 ? docs[docs.length - 1]?.id ?? null : null;

    return {
      messages,
      pagination: {
        limit: pageSize,
        hasMore,
        nextCursor,
      },
    };
  }

  static async markMessageRead(chatId: string, messageId: string, userId: string) {
    await ChatService.verifyMembership(chatId, userId);

    const messageDoc = await firestore
      .collection('chats')
      .doc(chatId)
      .collection('messages')
      .doc(messageId)
      .get();

    if (!messageDoc.exists) {
      throw new NotFoundError(`Message ${messageId} not found`);
    }

    // Deterministic doc ID makes multiple read requests idempotent
    const receiptRef = firestore
      .collection('chats')
      .doc(chatId)
      .collection('readReceipts')
      .doc(`${userId}_${messageId}`);

    const now = Timestamp.now();

    await receiptRef.set(
      {
        userId,
        messageId,
        readAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return {
      userId,
      messageId,
      readAt: now.toDate().toISOString(),
    };
  }

  static async updateLastSeen(chatId: string, userId: string, messageId: string) {
    await ChatService.verifyMembership(chatId, userId);

    const messageDoc = await firestore
      .collection('chats')
      .doc(chatId)
      .collection('messages')
      .doc(messageId)
      .get();

    if (!messageDoc.exists) {
      throw new NotFoundError(`Message ${messageId} not found`);
    }

    const messageData = messageDoc.data()!;
    const messageCreatedAt: FirestoreTimestamp =
      messageData['createdAt'] instanceof Timestamp
        ? (messageData['createdAt'] as FirestoreTimestamp)
        : Timestamp.now();

    const lastSeenRef = firestore
      .collection('chats')
      .doc(chatId)
      .collection('lastSeen')
      .doc(userId);

    const currentLastSeen = await lastSeenRef.get();

    // Prevent cursor from moving backwards
    if (currentLastSeen.exists) {
      const currentData = currentLastSeen.data();
      const currentTimestamp = currentData?.['messageCreatedAt'];

      if (
        currentTimestamp instanceof Timestamp &&
        messageCreatedAt.toMillis() < currentTimestamp.toMillis()
      ) {
        throw new BadRequestError('Cannot move last seen backwards to an earlier message');
      }
    }

    const now = Timestamp.now();

    await lastSeenRef.set({
      userId,
      messageId,
      messageCreatedAt,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return {
      userId,
      messageId,
      updatedAt: now.toDate().toISOString(),
    };
  }

  static async editMessage(chatId: string, messageId: string, userId: string, newText: string) {
    await ChatService.verifyMembership(chatId, userId);

    const ref = firestore.collection('chats').doc(chatId).collection('messages').doc(messageId);
    const doc = await ref.get();

    if (!doc.exists) {
      throw new NotFoundError(`Message ${messageId} not found`);
    }

    const data = doc.data()!;
    if (data['senderId'] !== userId) {
      throw new ForbiddenError('You can only edit your own messages');
    }

    if (data['isDeleted']) {
      throw new BadRequestError('Cannot edit a deleted message');
    }

    const now = Timestamp.now();
    await ref.update({
      text: newText.trim(),
      isEdited: true,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return {
      messageId,
      chatId,
      senderId: userId,
      text: newText.trim(),
      isEdited: true,
      updatedAt: now.toDate().toISOString(),
    };
  }

  static async deleteMessage(chatId: string, messageId: string, userId: string) {
    await ChatService.verifyMembership(chatId, userId);

    const ref = firestore.collection('chats').doc(chatId).collection('messages').doc(messageId);
    const doc = await ref.get();

    if (!doc.exists) {
      throw new NotFoundError(`Message ${messageId} not found`);
    }

    const data = doc.data()!;
    if (data['senderId'] !== userId) {
      throw new ForbiddenError('You can only delete your own messages');
    }

    const now = Timestamp.now();
    await ref.update({
      isDeleted: true,
      text: 'This message was deleted',
      updatedAt: FieldValue.serverTimestamp(),
    });

    return {
      messageId,
      chatId,
      isDeleted: true,
      updatedAt: now.toDate().toISOString(),
    };
  }
}
