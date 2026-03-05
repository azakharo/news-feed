import {useState, useCallback, useMemo} from 'react';
import {useQuery} from '@tanstack/react-query';
import {postsApi} from '../api/posts';
import type {NewPostsCountResponse} from '../types';

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
  showBanner: boolean;
  dismissBanner: () => void;
  resetBanner: () => void;
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

  // Track the count of new items when the banner was dismissed
  const [dismissedCount, setDismissedCount] = useState<number>(0);

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

  const newItemsCount = data?.count ?? 0;

  // Show banner only when new items count exceeds the dismissed count
  const showBanner = useMemo(() => {
    return newItemsCount > dismissedCount;
  }, [newItemsCount, dismissedCount]);

  // Dismiss the banner by recording the current new items count
  const dismissBanner = useCallback(() => {
    setDismissedCount(newItemsCount);
  }, [newItemsCount]);

  // Reset the banner state when user refreshes the feed
  const resetBanner = useCallback(() => {
    setDismissedCount(0);
  }, []);

  return {
    newItemsCount,
    latestCursor: data?.latestCursor ?? null,
    isPolling: isFetching,
    showBanner,
    dismissBanner,
    resetBanner,
  };
}
