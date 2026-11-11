import { BadRequestError } from './errors';

// Helper to keep direct chats unique regardless of who initiated it (userA vs userB)
export function getCanonicalDirectKey(userAId: string, userBId: string): string {
  const a = userAId.trim();
  const b = userBId.trim();

  if (!a || !b) {
    throw new BadRequestError('Both user IDs are required');
  }

  if (a === b) {
    throw new BadRequestError('userAId and userBId cannot be the same');
  }

  return a < b ? `${a}:${b}` : `${b}:${a}`;
}
