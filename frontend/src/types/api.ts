import type {Post} from './post';

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface GetPostsParams {
  limit?: number;
  cursor?: string;
  search?: string;
}

export type PostsResponse = PaginatedResponse<Post>;

export interface NewPostsCountResponse {
  count: number;
  latestCursor: string | null;
}

export interface GetNewCountParams {
  sinceCursor: string;
  search?: string;
}
