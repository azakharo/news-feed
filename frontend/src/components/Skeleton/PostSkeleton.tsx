export const PostSkeleton = () => (
  <div
    className="animate-pulse rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
    role="status"
    aria-label="Loading"
  >
    {/* Title skeleton */}
    <div className="mb-3 h-6 w-3/4 rounded-full bg-gray-200 dark:bg-gray-700" />

    {/* Content skeleton - multiple lines */}
    <div className="space-y-2">
      <div className="h-4 w-full rounded-full bg-gray-200 dark:bg-gray-700" />
      <div className="h-4 w-5/6 rounded-full bg-gray-200 dark:bg-gray-700" />
      <div className="h-4 w-4/6 rounded-full bg-gray-200 dark:bg-gray-700" />
    </div>

    {/* Image placeholder skeleton */}
    <div className="mt-3 h-48 w-full rounded-lg bg-gray-200 dark:bg-gray-700" />

    {/* Date skeleton */}
    <div className="mt-3 h-3 w-24 rounded-full bg-gray-200 dark:bg-gray-700" />

    <span className="sr-only">Loading...</span>
  </div>
);
