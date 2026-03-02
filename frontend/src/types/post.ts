export interface Attachment {
  type: 'image' | 'video';
  url: string;
  aspectRatio: number;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  attachments?: Attachment[];
  createdAt: string; // ISO date string
  cursorId: number;
}
