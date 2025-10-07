export interface Message {
  id: number;
  senderId: string | null;
  reciverId: string | null;
  content: string | null;
  sendingTime: string;
  isReaded: boolean;
}
