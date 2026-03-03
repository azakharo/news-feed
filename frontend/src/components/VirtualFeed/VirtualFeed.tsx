import {useState, useEffect, useRef} from 'react';
import {Alert} from 'flowbite-react';
import {HiInformationCircle} from 'react-icons/hi';
import {useVirtualFeed} from '../../hooks/useVirtualFeed';
import {postsApi} from '../../api/posts';
import {PostCard} from '../PostCard/PostCard';
import {LoadingIndicator} from '../LoadingIndicator/LoadingIndicator';
import {PostSkeleton} from '../Skeleton/PostSkeleton';
import type {Post} from '../../types/post';

const ITEM_HEIGHT = 416; // 400px card + 16px gap

interface VirtualFeedProps {
  searchQuery: string;
}

export const VirtualFeed = ({searchQuery}: VirtualFeedProps) => {
  const listRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);

  // Measure scroll margin after mount
  useEffect(() => {
    if (listRef.current) {
      setScrollMargin(listRef.current.offsetTop);
    }
  }, []);

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
  } = useVirtualFeed<Post>({
    queryKey: ['posts', {search: searchQuery}],
    queryFn: ({pageParam}) =>
      postsApi.getPosts({
        limit: 20,
        cursor: pageParam,
        search: searchQuery || undefined,
      }),
    estimateSize: () => ITEM_HEIGHT,
    overscan: 5,
    scrollMargin,
  });

  // Scroll to top on search change
  useEffect(() => {
    scrollToTop();
  }, [searchQuery, scrollToTop]);

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
          {Array.from({length: 5}).map((_, i) => (
            <PostSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Virtualized List - Window Scroll */}
      {!isLoading && (
        <>
          {/* List container with ref for scroll margin calculation */}
          <div ref={listRef}>
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
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualItem.size}px`,
                      transform: `translateY(${virtualItem.start - scrollMargin}px)`,
                      paddingBottom: '16px', // Gap between cards
                    }}
                  >
                    {post && <PostCard post={post} />}
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
