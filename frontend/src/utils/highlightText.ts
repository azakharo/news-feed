import type {ReactNode} from 'react';
import {createElement} from 'react';

interface HighlightMatch {
  text: string;
  isHighlight: boolean;
}

/**
 * Splits text into segments, marking which ones match the search query.
 * Case-insensitive matching.
 */
export function splitBySearchQuery(
  text: string,
  searchQuery: string,
): HighlightMatch[] {
  if (!searchQuery.trim()) {
    return [{text, isHighlight: false}];
  }

  const segments: HighlightMatch[] = [];
  const lowerText = text.toLowerCase();
  const lowerQuery = searchQuery.toLowerCase();
  let lastIndex = 0;

  let index = lowerText.indexOf(lowerQuery);
  while (index !== -1) {
    // Add non-matching segment before
    if (index > lastIndex) {
      segments.push({
        text: text.slice(lastIndex, index),
        isHighlight: false,
      });
    }

    // Add matching segment (preserve original case)
    segments.push({
      text: text.slice(index, index + searchQuery.length),
      isHighlight: true,
    });

    lastIndex = index + searchQuery.length;
    index = lowerText.indexOf(lowerQuery, lastIndex);
  }

  // Add remaining non-matching segment
  if (lastIndex < text.length) {
    segments.push({
      text: text.slice(lastIndex),
      isHighlight: false,
    });
  }

  return segments;
}

/**
 * Renders text with search matches highlighted.
 * Returns an array of React nodes.
 */
export function renderHighlightedText(
  text: string,
  searchQuery: string,
  highlightClassName: string = 'bg-yellow-200 dark:bg-yellow-700 rounded px-0.5',
): ReactNode[] {
  const segments = splitBySearchQuery(text, searchQuery);

  return segments.map((segment, index) => {
    if (segment.isHighlight) {
      return createElement(
        'mark',
        {
          key: index,
          className: highlightClassName,
        },
        segment.text,
      );
    }
    return segment.text;
  });
}
