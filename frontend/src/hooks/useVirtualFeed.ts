import {useEffect, useCallback} from 'react';
import {useWindowVirtualizer} from '@tanstack/react-virtual';
import {useInfiniteQuery} from '@tanstack/react-query';

interface UseVirtualFeedOptions<T> {
  // Query options
  queryKey: unknown[];
  queryFn: (context: {pageParam?: string}) => Promise<{
    items: T[];
    nextCursor: string | null;
    hasMore: boolean;
  }>;

  // Virtual options
  estimateSize?: (index: number, item: T) => number;
  overscan?: number;
}

interface UseVirtualFeedReturn<T> {
  // Virtual data
  virtualItems: ReturnType<
    ReturnType<typeof useWindowVirtualizer>['getVirtualItems']
  >;
  totalSize: number;
  scrollMargin: number;

  // Query data
  items: T[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;

  // Actions
  fetchNextPage: () => Promise<unknown>;
  scrollToTop: () => void;
}

const DEFAULT_ITEM_HEIGHT = 400;
const DEFAULT_OVERSCAN = 5;

export function useVirtualFeed<T extends {id: string}>({
  queryKey,
  queryFn,
  estimateSize = () => DEFAULT_ITEM_HEIGHT,
  overscan = DEFAULT_OVERSCAN,
  scrollMargin = 0,
}: UseVirtualFeedOptions<T> & {
  scrollMargin?: number;
}): UseVirtualFeedReturn<T> {
  // Infinite query for data
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey,
    queryFn,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: lastPage => {
      if (!lastPage.hasMore || !lastPage.nextCursor) {
        return undefined;
      }
      return lastPage.nextCursor;
    },
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5,
  });

  // Flatten pages into single array
  const items = data?.pages.flatMap(page => page.items) ?? [];

  // Window scroll virtualizer - uses window as scroll container
  const virtualizer = useWindowVirtualizer({
    count: items.length,
    estimateSize: index => estimateSize(index, items[index]),
    overscan,
    scrollMargin,
  });

  // Get virtual items
  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  // Auto-fetch when near bottom
  const lastItem = virtualItems[virtualItems.length - 1];

  useEffect(() => {
    if (!lastItem) return;

    // Fetch more when user is within 10 items from the end
    const itemsFromEnd = items.length - lastItem.index;

    if (itemsFromEnd < 10 && hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [lastItem, items.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Scroll to top helper - uses native window scroll
  const scrollToTop = useCallback(() => {
    window.scrollTo({top: 0, behavior: 'smooth'});
  }, []);

  return {
    virtualItems,
    totalSize,
    scrollMargin,
    items,
    isLoading,
    isError,
    error,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    scrollToTop,
  };
}
