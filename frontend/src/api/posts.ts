import {apiClient} from './client';
import type {
  PostsResponse,
  GetPostsParams,
  NewPostsCountResponse,
  GetNewCountParams,
} from '../types/api';

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
