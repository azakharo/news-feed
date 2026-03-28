import { PostEntity } from '../../entities/post.entity';

/**
 * Sample video URLs from Google's test video collection
 */
const SAMPLE_VIDEOS = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4',
] as const;

/**
 * Generate random attachments for test posts
 */
export function generateRandomAttachments():
  | PostEntity['attachments']
  | undefined {
  const hasAttachments = Math.random() > 0.6; // 40% chance of having attachments
  if (!hasAttachments) {
    return undefined;
  }

  const count = Math.floor(Math.random() * 4) + 1; // 1 to 4 attachments
  const attachments: PostEntity['attachments'] = [];
  const types: ('image' | 'video')[] = ['image', 'image', 'image', 'video']; // More images than videos

  for (let i = 0; i < count; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const aspectRatio = [16 / 9, 4 / 3, 1, 9 / 16, 3 / 4][
      Math.floor(Math.random() * 5)
    ];

    let url: string;
    if (type === 'video') {
      // Use real video URLs for video attachments
      url = SAMPLE_VIDEOS[Math.floor(Math.random() * SAMPLE_VIDEOS.length)];
    } else {
      // Use picsum.photos for image attachments
      url = `https://picsum.photos/seed/${Math.random().toString(36).substring(7)}/${Math.floor(800 * aspectRatio)}/800`;
    }

    attachments.push({
      type,
      url,
      aspectRatio,
    });
  }

  return attachments;
}
