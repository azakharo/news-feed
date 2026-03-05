import {Badge, Button} from 'flowbite-react';
import {HiArrowUp, HiBell, HiX} from 'react-icons/hi';

interface NewItemsBannerProps {
  count: number;
  onRefresh: () => void;
  onDismiss: () => void;
}

export const NewItemsBanner: React.FC<NewItemsBannerProps> = ({
  count,
  onRefresh,
  onDismiss,
}) => {
  if (count === 0) return null;

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDismiss();
  };

  return (
    <div
      className="w-full cursor-pointer bg-linear-to-r from-blue-600 to-blue-500 px-4 py-3 text-white shadow-lg transition-all duration-300 ease-in-out hover:from-blue-700 hover:to-blue-600"
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
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
        <div className="flex items-center gap-3">
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
        <Button
          color="blue"
          size="xs"
          onClick={handleDismiss}
          className="bg-blue-800 hover:bg-blue-900"
          aria-label="Dismiss notification"
        >
          <HiX className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
