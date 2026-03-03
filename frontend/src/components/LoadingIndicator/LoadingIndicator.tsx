import {Spinner} from 'flowbite-react';

export const LoadingIndicator = () => (
  <div className="flex items-center justify-center gap-2 py-4">
    <Spinner size="md" />
    <span className="text-gray-500 dark:text-gray-400">
      Loading more posts...
    </span>
  </div>
);
