import {Badge} from 'flowbite-react';
import {HiArrowUp, HiBell} from 'react-icons/hi';

interface NewItemsBannerProps {
  count: number;
  onRefresh: () => void;
  variant?: 'default' | 'compact';
}

export const NewItemsBanner: React.FC<NewItemsBannerProps> = ({
  count,
  onRefresh,
  variant = 'default',
}) => {
  if (count === 0) return null;

  const isCompact = variant === 'compact';

  return (
    <div
      className={`cursor-pointer bg-linear-to-r from-blue-600 to-blue-500 text-white shadow-lg transition-all duration-300 ease-in-out hover:from-blue-700 hover:to-blue-600 ${
        isCompact
          ? 'shrink-0 rounded-lg px-2 py-1.5 sm:px-3 sm:py-2'
          : 'sticky top-0 z-50 w-full px-4 py-3'
      }`}
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
      <div
        className={`flex items-center gap-2 ${
          isCompact
            ? 'justify-center'
            : 'mx-auto max-w-2xl justify-center gap-3'
        }`}
      >
        <HiBell
          className={`animate-pulse ${isCompact ? 'h-4 w-4' : 'h-5 w-5'}`}
        />
        <div className="flex items-center gap-1 sm:gap-2">
          <Badge
            color="info"
            size={isCompact ? 'xs' : 'sm'}
            className="bg-blue-800 text-white"
          >
            {count}
          </Badge>
          {!isCompact && (
            <span className="font-medium">
              {count === 1 ? 'new post available' : 'new posts available'}
            </span>
          )}
        </div>
        {!isCompact && (
          <div className="flex items-center gap-1 text-blue-100">
            <HiArrowUp className="h-4 w-4" />
            <span className="text-sm">Click to refresh</span>
          </div>
        )}
      </div>
    </div>
  );
};
