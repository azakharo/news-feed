import {useQuery} from '@tanstack/react-query';
import {postsApi} from '../api/posts';
import type {NewPostsCountResponse} from '../types/api';

interface UseNewItemsPollerOptions {
  sinceCursor: string | null;
  searchQuery?: string;
  pollingInterval?: number;
  enabled?: boolean;
}

interface UseNewItemsPollerReturn {
  newItemsCount: number;
  latestCursor: string | null;
  isPolling: boolean;
}

const DEFAULT_POLLING_INTERVAL = 30000; // 30 seconds

export function useNewItemsPoller(
  options: UseNewItemsPollerOptions,
): UseNewItemsPollerReturn {
  const {
    sinceCursor,
    searchQuery,
    pollingInterval = DEFAULT_POLLING_INTERVAL,
    enabled = true,
  } = options;

  const {data, isFetching} = useQuery<NewPostsCountResponse>({
    queryKey: ['posts-new-count', sinceCursor, searchQuery],
    queryFn: () =>
      postsApi.getNewPostsCount({
        sinceCursor: sinceCursor!,
        search: searchQuery,
      }),
    enabled: !!sinceCursor && enabled,
    refetchInterval: pollingInterval,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  return {
    newItemsCount: data?.count ?? 0,
    latestCursor: data?.latestCursor ?? null,
    isPolling: isFetching,
  };
}
