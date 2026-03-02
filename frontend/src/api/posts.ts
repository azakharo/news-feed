import {apiClient} from './client';
import type {PostsResponse, GetPostsParams} from '../types/api';

export const postsApi = {
  getPosts: async (params: GetPostsParams): Promise<PostsResponse> => {
    const response = await apiClient.get<PostsResponse>('/posts', {
      params: {
        limit: params.limit ?? 20,
        cursor: params.cursor,
        search: params.search || undefined,
      },
    });
    return response.data;
  },
};
