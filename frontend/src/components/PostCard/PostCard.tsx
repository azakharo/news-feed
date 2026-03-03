import {Card} from 'flowbite-react';
import type {Post} from '../../types/post';

interface PostCardProps {
  post: Post;
}

// Using ref for Phase 4 measureElement support
export const PostCard = ({
  ref,
  post,
}: PostCardProps & {ref?: React.RefObject<HTMLDivElement | null>}) => {
  return (
    <Card
      ref={ref}
      className="overflow-hidden transition-shadow hover:shadow-md"
      // Fixed height for virtualization - content must fit within this
      style={{height: '400px', display: 'flex', flexDirection: 'column'}}
    >
      <h3 className="mb-2 flex-shrink-0 text-lg font-semibold text-gray-900 dark:text-white">
        {post.title}
      </h3>

      <p className="mb-3 line-clamp-3 flex-shrink-0 text-gray-700 dark:text-gray-300">
        {post.content}
      </p>

      {post.attachments && post.attachments.length > 0 && (
        <div className="mt-2 min-h-0 flex-1 overflow-hidden">
          {post.attachments.slice(0, 1).map(attachment => (
            <div
              key={attachment.url}
              className="h-full overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-700"
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
                />
              )}
            </div>
          ))}
        </div>
      )}

      <time className="mt-3 block flex-shrink-0 text-sm text-gray-500 dark:text-gray-400">
        {new Date(post.createdAt).toLocaleDateString()}
      </time>
    </Card>
  );
};
