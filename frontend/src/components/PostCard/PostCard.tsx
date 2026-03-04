import {useMemo} from 'react';
import {Card} from 'flowbite-react';
import type {Post} from '../../types/post';
import {HighlightedText} from '../HighlightedText/HighlightedText';
import {ExpandButton} from '../ExpandButton/ExpandButton';

interface PostCardProps {
  post: Post;
  isExpanded: boolean;
  onToggleExpand: () => void;
  searchQuery?: string;
}

const CHARS_PER_LINE = 80;
const MAX_COLLAPSED_LINES = 4;

/**
 * Post card component with dynamic height support.
 * Uses forwardRef for measureElement integration.
 */
export const PostCard = ({
  ref,
  post,
  isExpanded,
  onToggleExpand,
  searchQuery = '',
}: PostCardProps & {ref?: React.RefObject<HTMLDivElement | null>}) => {
  // Calculate line count for expand button visibility
  const totalLines = useMemo(
    () => Math.ceil(post.content.length / CHARS_PER_LINE),
    [post.content],
  );

  // Content class based on expansion state
  const contentClassName = isExpanded
    ? 'mb-3 text-gray-700 dark:text-gray-300'
    : 'mb-3 text-gray-700 dark:text-gray-300 line-clamp-4';

  return (
    <Card
      ref={ref}
      className="transition-shadow hover:shadow-md"
      data-post-id={post.id}
    >
      {/* Title with optional highlighting */}
      <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
        {searchQuery ? (
          <HighlightedText text={post.title} searchQuery={searchQuery} />
        ) : (
          post.title
        )}
      </h3>

      {/* Content with optional highlighting and expand/collapse */}
      <div className={contentClassName}>
        {searchQuery ? (
          <HighlightedText text={post.content} searchQuery={searchQuery} />
        ) : (
          post.content
        )}
      </div>

      {/* Expand/Collapse Button */}
      <ExpandButton
        isExpanded={isExpanded}
        onToggle={onToggleExpand}
        collapsedLines={MAX_COLLAPSED_LINES}
        totalLines={totalLines}
      />

      {/* Attachments with aspect-ratio placeholders */}
      {post.attachments && post.attachments.length > 0 && (
        <div className="mt-3 space-y-3">
          {post.attachments.map((attachment, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-700"
              style={{aspectRatio: attachment.aspectRatio}}
            >
              {attachment.type === 'image' ? (
                <img
                  src={attachment.url}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <video
                  src={attachment.url}
                  className="h-full w-full object-cover"
                  controls
                  preload="metadata"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Date */}
      <time className="mt-3 block text-sm text-gray-500 dark:text-gray-400">
        {new Date(post.createdAt).toLocaleDateString()}
      </time>
    </Card>
  );
};

PostCard.displayName = 'PostCard';
