import {useState, useEffect, useRef, useCallback} from 'react';
import {Alert} from 'flowbite-react';
import {HiInformationCircle} from 'react-icons/hi';
import {usePostExpansion} from '../../hooks/usePostExpansion';
import {useVirtualFeed} from '../../hooks/useVirtualFeed';
import {useNewItemsPoller} from '../../hooks/useNewItemsPoller';
import {postsApi} from '../../api/posts';
import {PostCard} from '../PostCard';
import {LoadingIndicator} from '../LoadingIndicator';
import {PostSkeleton} from '../Skeleton/PostSkeleton';
import {NewItemsBanner} from '../NewItemsBanner';
import {createEstimateSizeFunction} from '../../utils/estimatePostSize';
import type {Post} from '../../types/post';

const SKELETON_KEYS = [
  'skeleton-1',
  'skeleton-2',
  'skeleton-3',
  'skeleton-4',
  'skeleton-5',
];

interface VirtualFeedProps {
  searchQuery?: string;
}

export const VirtualFeed = ({searchQuery = ''}: VirtualFeedProps) => {
  const listRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);

  // Expansion state management
  const {isExpanded, toggle} = usePostExpansion();

  // Disable browser's automatic scroll restoration to prevent scroll position persisting on F5 refresh
  // This makes the feed always start from the top on page refresh
  useEffect(() => {
    if (history.scrollRestoration !== 'manual') {
      history.scrollRestoration = 'manual';
    }
    window.scrollTo({top: 0, behavior: 'auto'});
  }, []);

  // Measure scroll margin after mount
  useEffect(() => {
    if (listRef.current) {
      setScrollMargin(listRef.current.offsetTop);
    }
  }, []);

  // Memoized estimate size function that considers expansion state
  const estimateSize = useCallback(
    (index: number, post: Post | undefined) => {
      if (!post) return 400;
      const estimateFn = createEstimateSizeFunction([post], postId =>
        isExpanded(postId),
      );
      return estimateFn(index);
    },
    [isExpanded],
  );

  const {
    virtualItems,
    totalSize,
    items: posts,
    isLoading,
    isError,
    error,
    isFetchingNextPage,
    hasNextPage,
    scrollToTop,
    measureElement,
    resetAndRefetch,
  } = useVirtualFeed<Post>({
    queryKey: ['posts', {search: searchQuery}],
    queryFn: ({pageParam}) =>
      postsApi.getPosts({
        limit: 20,
        cursor: pageParam,
        search: searchQuery || undefined,
      }),
    estimateSize,
    overscan: 5,
    scrollMargin,
  });

  // Get first post's cursor for polling new items
  const firstPostCursor = posts.length > 0 ? String(posts[0].cursorId) : null;

  // Poll for new items
  const {newItemsCount, showBanner, dismissBanner} = useNewItemsPoller({
    sinceCursor: firstPostCursor,
    searchQuery,
    pollingInterval: 30000,
  });

  // Handle refresh when banner is clicked
  const handleRefreshNewItems = useCallback(() => {
    void resetAndRefetch();
    scrollToTop();
  }, [resetAndRefetch, scrollToTop]);

  // Scroll to top on search change
  useEffect(() => {
    scrollToTop();
  }, [searchQuery, scrollToTop]);

  // Handle expand toggle - need to remeasure the item
  const handleToggleExpand = useCallback(
    (postId: string) => {
      // Save the current scroll position before expansion
      const scrollYBefore = window.scrollY;

      toggle(postId);
      // The virtualizer will automatically remeasure on next render
      // via the measureElement ref callback

      // Restore scroll position after expansion to prevent unwanted jumps
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (window.scrollY !== scrollYBefore) {
            window.scrollTo({top: scrollYBefore, behavior: 'auto'});
          }
        });
      });
    },
    [toggle],
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-4">
      {/* Error State */}
      {isError && (
        <Alert color="failure" icon={HiInformationCircle} className="mb-4">
          <span className="font-medium">Error loading posts!</span>{' '}
          {error instanceof Error ? error.message : 'Please try again later.'}
        </Alert>
      )}

      {/* Initial Loading State */}
      {isLoading && (
        <div className="space-y-4">
          {SKELETON_KEYS.map(key => (
            <PostSkeleton key={key} />
          ))}
        </div>
      )}

      {/* Virtualized List - Window Scroll with Dynamic Heights */}
      {!isLoading && (
        <>
          {/* New Items Banner - fixed position so it stays visible and doesn't affect scroll */}
          {showBanner && (
            <div
              className="fixed top-[82px] right-0 left-0 z-50 mx-auto max-w-2xl px-4"
              style={{pointerEvents: 'none'}}
            >
              <div style={{pointerEvents: 'auto'}}>
                <NewItemsBanner
                  count={newItemsCount}
                  onRefresh={handleRefreshNewItems}
                  onDismiss={dismissBanner}
                />
              </div>
            </div>
          )}

          {/* List container with ref for scroll margin calculation */}
          {/* overflow-anchor: none prevents browser scroll anchoring that causes jumps */}
          <div
            ref={listRef}
            style={{
              overflowAnchor: 'none',
              marginTop: showBanner ? '56px' : '0',
            }}
          >
            {/* Phantom container for scrollbar */}
            <div
              style={{
                height: `${totalSize}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {virtualItems.map(virtualItem => {
                const post = posts[virtualItem.index];

                return (
                  <div
                    key={post?.id ?? virtualItem.key}
                    data-index={virtualItem.index}
                    ref={measureElement} // Connect measureElement for dynamic height
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      // NO height property - let measureElement determine it
                      transform: `translateY(${virtualItem.start - scrollMargin}px)`,
                      paddingBottom: '16px', // Gap between cards
                    }}
                  >
                    {post && (
                      <PostCard
                        post={post}
                        isExpanded={isExpanded(post.id)}
                        onToggleExpand={() => handleToggleExpand(post.id)}
                        searchQuery={searchQuery}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Loading indicator at bottom */}
          {isFetchingNextPage && (
            <div className="py-4">
              <LoadingIndicator />
            </div>
          )}

          {/* End of list indicator */}
          {!isFetchingNextPage && !hasNextPage && posts.length > 0 && (
            <div className="py-4 text-center text-gray-500 dark:text-gray-400">
              You have reached the end of the feed
            </div>
          )}
        </>
      )}

      {/* Empty State */}
      {!isLoading && posts.length === 0 && !isError && (
        <div className="py-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            {searchQuery
              ? 'No posts found matching your search.'
              : 'No posts available.'}
          </p>
        </div>
      )}
    </div>
  );
};
