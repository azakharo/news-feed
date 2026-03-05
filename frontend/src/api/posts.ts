import {apiClient} from './client';
import type {
  PostResponse,
  GetPostsParams,
  NewPostsCountResponse,
  GetNewCountParams,
} from '../types';

export const postsApi = {
  getPosts: async (params: GetPostsParams): Promise<PostResponse> => {
    const response = await apiClient.get<PostResponse>('/posts', {
      params: {
        limit: params.limit ?? 20,
        cursor: params.cursor,
        search: params.search || undefined,
      },
    });
    return response.data;
  },

  getNewPostsCount: async (
    params: GetNewCountParams,
  ): Promise<NewPostsCountResponse> => {
    const response = await apiClient.get<NewPostsCountResponse>(
      '/posts/new-count',
      {
        params: {
          sinceCursor: params.sinceCursor,
          search: params.search || undefined,
        },
      },
    );
    return response.data;
  },
};
