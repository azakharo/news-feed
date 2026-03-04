import {memo} from 'react';
import {renderHighlightedText} from '../../utils/highlightText';

interface HighlightedTextProps {
  text: string;
  searchQuery: string;
  className?: string;
  highlightClassName?: string;
}

/**
 * Renders text with search query matches highlighted.
 * Memoized to prevent unnecessary re-renders.
 */
export const HighlightedText = memo(function HighlightedText({
  text,
  searchQuery,
  className,
  highlightClassName,
}: HighlightedTextProps) {
  const content = renderHighlightedText(text, searchQuery, highlightClassName);

  return <span className={className}>{content}</span>;
});
