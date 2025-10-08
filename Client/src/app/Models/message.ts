export interface Message {
  id: number;
  senderId: string | null;
  receiverId: string | null;
  content: string | null;
  sendingTime: string;
  isReaded: boolean;
}
