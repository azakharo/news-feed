import {useState} from 'react';
import {Alert} from 'flowbite-react';
import {HiInformationCircle} from 'react-icons/hi';
import {useInfinitePosts} from '../../hooks/useInfinitePosts';
import {useDebounce} from '../../hooks/useDebounce';
import {PostCard} from '../PostCard/PostCard';
import {PostSkeleton} from '../Skeleton/PostSkeleton';
import {SearchInput} from '../SearchInput/SearchInput';
import {LoadMore} from '../LoadMore/LoadMore';

const SEARCH_DEBOUNCE_MS = 500;
const SKELETON_KEYS = [
  'skeleton-1',
  'skeleton-2',
  'skeleton-3',
  'skeleton-4',
  'skeleton-5',
];

export const FeedList = () => {
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, SEARCH_DEBOUNCE_MS);

  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfinitePosts({
    search: debouncedSearch,
  });

  // Flatten pages into single array
  const posts = data?.pages.flatMap(page => page.items) ?? [];

  return (
    <div className="mx-auto max-w-2xl p-4">
      {/* Search Header */}
      <div className="mb-6">
        <SearchInput
          value={searchInput}
          onChange={setSearchInput}
          placeholder="Search posts by title or content..."
        />
      </div>

      {/* Error State - Using Flowbite Alert */}
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

      {/* Posts List */}
      {!isLoading && (
        <>
          <div className="space-y-4">
            {posts.map(post => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>

          {/* Load More Button */}
          <LoadMore
            onClick={() => {
              void fetchNextPage();
            }}
            isLoading={isFetchingNextPage}
            hasMore={hasNextPage ?? false}
          />
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
