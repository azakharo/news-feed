import type {components} from './generated/api';

// Entity types from schemas
export type Post = components['schemas']['PostItemDto'];
export type Attachment = components['schemas']['AttachmentDto'];

// Response types - manually defined to match actual API
// (generated types have incorrect nextCursor: Record<string, never> | null)
export interface PostResponse {
  items: Post[];
  nextCursor: string | null;
  hasMore: boolean;
}

// Manually defined since generated response has optional fields
export interface NewPostsCountResponse {
  count: number;
  latestCursor: string | null;
}

// Request parameter types - manually defined
// (generated types have optional query object)
export interface GetPostsParams {
  limit?: number;
  cursor?: string;
  search?: string;
}

export interface GetNewCountParams {
  sinceCursor: string;
  search?: string;
}

// Generic paginated response type
export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}
