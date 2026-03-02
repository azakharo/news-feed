import {useInfiniteQuery} from '@tanstack/react-query';
import {postsApi} from '../api/posts';

interface UseInfinitePostsOptions {
  search?: string;
  pageSize?: number;
}

export function useInfinitePosts(options: UseInfinitePostsOptions = {}) {
  const {search = '', pageSize = 20} = options;

  return useInfiniteQuery({
    queryKey: ['posts', {search, pageSize}],
    queryFn: ({pageParam}) =>
      postsApi.getPosts({
        limit: pageSize,
        cursor: pageParam,
        search: search || undefined,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: lastPage => {
      if (!lastPage.hasMore || !lastPage.nextCursor) {
        return undefined;
      }
      return lastPage.nextCursor;
    },
  });
}
