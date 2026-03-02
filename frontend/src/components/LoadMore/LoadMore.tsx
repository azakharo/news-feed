import {Button, Spinner} from 'flowbite-react';

interface LoadMoreProps {
  onClick: () => void;
  isLoading: boolean;
  hasMore: boolean;
}

export const LoadMore = ({onClick, isLoading, hasMore}: LoadMoreProps) => {
  if (!hasMore) {
    return (
      <p className="py-4 text-center text-gray-500 dark:text-gray-400">
        No more posts to load
      </p>
    );
  }

  return (
    <div className="flex justify-center py-4">
      <Button onClick={onClick} disabled={isLoading} size="lg" color="blue">
        {isLoading ? (
          <>
            <Spinner className="mr-2" size="sm" />
            Loading...
          </>
        ) : (
          'Load More'
        )}
      </Button>
    </div>
  );
};
