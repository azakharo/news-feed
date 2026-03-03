import {useState, useEffect, useRef} from 'react';
import {Alert} from 'flowbite-react';
import {HiInformationCircle} from 'react-icons/hi';
import {useDebounce} from '../../hooks/useDebounce';
import {useVirtualFeed} from '../../hooks/useVirtualFeed';
import {postsApi} from '../../api/posts';
import {PostCard} from '../PostCard/PostCard';
import {SearchInput} from '../SearchInput/SearchInput';
import {LoadingIndicator} from '../LoadingIndicator/LoadingIndicator';
import {PostSkeleton} from '../Skeleton/PostSkeleton';
import type {Post} from '../../types/post';

const SEARCH_DEBOUNCE_MS = 500;
const ITEM_HEIGHT = 400;

export const VirtualFeed = () => {
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, SEARCH_DEBOUNCE_MS);
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
    queryKey: ['posts', {search: debouncedSearch}],
    queryFn: ({pageParam}) =>
      postsApi.getPosts({
        limit: 20,
        cursor: pageParam,
        search: debouncedSearch || undefined,
      }),
    estimateSize: () => ITEM_HEIGHT,
    overscan: 5,
    scrollMargin,
  });

  // Scroll to top on search change
  useEffect(() => {
    scrollToTop();
  }, [debouncedSearch, scrollToTop]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-4">
      {/* Search Header */}
      <div className="mb-6">
        <SearchInput
          value={searchInput}
          onChange={setSearchInput}
          placeholder="Search posts by title or content..."
        />
      </div>

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
            {debouncedSearch
              ? 'No posts found matching your search.'
              : 'No posts available.'}
          </p>
        </div>
      )}
    </div>
  );
};
