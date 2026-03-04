import {useCallback, useState} from 'react';

/**
 * Manages expansion state for posts in the virtualized list.
 * Uses post IDs to track which posts are expanded.
 */
export function usePostExpansion() {
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(
    () => new Set(),
  );

  const isExpanded = useCallback(
    (postId: string) => expandedPosts.has(postId),
    [expandedPosts],
  );

  const toggle = useCallback((postId: string) => {
    setExpandedPosts(prev => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
  }, []);

  const expand = useCallback((postId: string) => {
    setExpandedPosts(prev => {
      const next = new Set(prev);
      next.add(postId);
      return next;
    });
  }, []);

  const collapse = useCallback((postId: string) => {
    setExpandedPosts(prev => {
      const next = new Set(prev);
      next.delete(postId);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setExpandedPosts(new Set());
  }, []);

  return {
    expandedPosts,
    isExpanded,
    toggle,
    expand,
    collapse,
    reset,
  };
}
