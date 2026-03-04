import {Badge} from 'flowbite-react';
import {HiArrowUp, HiBell} from 'react-icons/hi';

interface NewItemsBannerProps {
  count: number;
  onRefresh: () => void;
}

export const NewItemsBanner: React.FC<NewItemsBannerProps> = ({
  count,
  onRefresh,
}) => {
  if (count === 0) return null;

  return (
    <div
      className="sticky top-0 z-50 w-full cursor-pointer bg-linear-to-r from-blue-600 to-blue-500 px-4 py-3 text-white shadow-lg transition-all duration-300 ease-in-out hover:from-blue-700 hover:to-blue-600"
      onClick={onRefresh}
      role="button"
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onRefresh();
        }
      }}
      aria-label={`Show ${count} new posts`}
    >
      <div className="mx-auto flex max-w-2xl items-center justify-center gap-3">
        <HiBell className="h-5 w-5 animate-pulse" />
        <div className="flex items-center gap-2">
          <Badge color="info" size="sm" className="bg-blue-800 text-white">
            {count}
          </Badge>
          <span className="font-medium">
            {count === 1 ? 'new post available' : 'new posts available'}
          </span>
        </div>
        <div className="flex items-center gap-1 text-blue-100">
          <HiArrowUp className="h-4 w-4" />
          <span className="text-sm">Click to refresh</span>
        </div>
      </div>
    </div>
  );
};
