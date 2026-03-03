import {memo} from 'react';
import {Button} from 'flowbite-react';
import {HiChevronDown, HiChevronUp} from 'react-icons/hi';

interface ExpandButtonProps {
  isExpanded: boolean;
  onToggle: () => void;
  collapsedLines: number;
  totalLines: number;
}

/**
 * Button to expand/collapse long post content.
 * Only shows when content exceeds collapsed line limit.
 */
export const ExpandButton = memo(function ExpandButton({
  isExpanded,
  onToggle,
  collapsedLines,
  totalLines,
}: ExpandButtonProps) {
  // Don't show button if content fits in collapsed view
  if (totalLines <= collapsedLines) {
    return null;
  }

  return (
    <Button
      color="light"
      size="xs"
      onClick={onToggle}
      className="mt-2 w-full"
      pill
    >
      {isExpanded ? (
        <>
          <HiChevronUp className="mr-1 h-4 w-4" />
          Show less
        </>
      ) : (
        <>
          <HiChevronDown className="mr-1 h-4 w-4" />
          Show more
        </>
      )}
    </Button>
  );
});
