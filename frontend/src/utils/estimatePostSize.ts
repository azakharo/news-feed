import type {Post} from '../types/post';

// Constants for size estimation
const BASE_HEIGHT = 120; // Card padding, title, date
const LINE_HEIGHT = 24; // Approximate line height for text
const CHARS_PER_LINE = 80; // Approximate characters per line
const MAX_COLLAPSED_LINES = 4; // Max lines when collapsed
const ATTACHMENT_GAP = 12; // Gap between attachments
const EXPANDED_BONUS = 60; // Extra height for expand button area

/**
 * Estimates the height of a post card based on its content.
 * This is used by the virtualizer for initial positioning before measureElement.
 */
export function estimatePostHeight(
  post: Post,
  isExpanded: boolean = false,
): number {
  let height = BASE_HEIGHT;

  // Calculate text height
  const textLength = post.content.length;
  const lines = Math.ceil(textLength / CHARS_PER_LINE);

  if (isExpanded) {
    // Full text when expanded
    height += lines * LINE_HEIGHT;
    height += EXPANDED_BONUS;
  } else {
    // Clamped to max lines when collapsed
    const visibleLines = Math.min(lines, MAX_COLLAPSED_LINES);
    height += visibleLines * LINE_HEIGHT;
  }

  // Add attachment heights using aspect ratio
  if (post.attachments && post.attachments.length > 0) {
    // Assume full width container, calculate based on aspect ratio
    // For a typical mobile-ish feed width of ~600px
    const containerWidth = 600;

    post.attachments.forEach(attachment => {
      // aspectRatio = width / height, so height = width / aspectRatio
      const attachmentHeight = containerWidth / attachment.aspectRatio;
      height += attachmentHeight + ATTACHMENT_GAP;
    });
  }

  return height;
}

/**
 * Creates an estimateSize function for the virtualizer.
 * This closure has access to the current items and expansion state.
 */
export function createEstimateSizeFunction(
  items: Post[],
  getIsExpanded: (postId: string) => boolean,
) {
  return (index: number): number => {
    const post = items[index];
    if (!post) return 200; // Fallback

    const expanded = getIsExpanded(post.id);
    return estimatePostHeight(post, expanded);
  };
}
