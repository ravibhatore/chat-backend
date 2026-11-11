export * from './firestore';

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

export interface ChatSummary {
  chatId: string;
  type: string;
  name?: string | null;
  memberIds: string[];
  members?: UserSummary[];
  createdAt: string;
  lastMessage?: {
    messageId: string;
    senderId: string;
    text: string;
    createdAt: string;
  } | null;
}

