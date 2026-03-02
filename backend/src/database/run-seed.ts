import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';
import { PostEntity } from '../entities/post.entity';

/**
 * Generate random text of specified length
 */
function generateRandomText(minLength: number, maxLength: number): string {
  const words = [
    'the',
    'be',
    'to',
    'of',
    'and',
    'a',
    'in',
    'that',
    'have',
    'I',
    'it',
    'for',
    'not',
    'on',
    'with',
    'he',
    'as',
    'you',
    'do',
    'at',
    'this',
    'but',
    'his',
    'by',
    'from',
    'they',
    'we',
    'say',
    'her',
    'she',
    'or',
    'an',
    'will',
    'my',
    'one',
    'all',
    'would',
    'there',
    'their',
    'what',
    'so',
    'up',
    'out',
    'if',
    'about',
    'who',
    'get',
    'which',
    'go',
    'me',
    'when',
    'make',
    'can',
    'like',
    'time',
    'no',
    'just',
    'him',
    'know',
    'take',
    'people',
    'into',
    'year',
    'your',
    'good',
    'some',
    'could',
    'them',
    'see',
    'other',
    'than',
    'then',
    'now',
    'look',
    'only',
    'come',
    'its',
    'over',
    'think',
    'also',
    'back',
    'after',
    'use',
    'two',
    'how',
    'our',
    'work',
    'first',
    'well',
    'way',
    'even',
    'new',
    'want',
    'because',
    'any',
    'these',
    'give',
    'day',
    'most',
    'us',
    'news',
    'feed',
    'post',
    'update',
    'share',
    'like',
    'comment',
    'social',
    'media',
    'trending',
    'viral',
    'story',
    'article',
    'breaking',
    'latest',
    'world',
    'local',
    'national',
    'international',
    'tech',
    'science',
    'sports',
    'entertainment',
    'business',
    'politics',
    'health',
    'lifestyle',
    'travel',
    'food',
    'amazing',
    'incredible',
    'shocking',
    'surprising',
    'unexpected',
    'wonderful',
    'fantastic',
    'awesome',
  ];

  const length =
    Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;
  let text = '';
  while (text.length < length) {
    const word = words[Math.floor(Math.random() * words.length)];
    if (text.length === 0) {
      text = word.charAt(0).toUpperCase() + word.slice(1);
    } else {
      text += ' ' + word;
    }
  }
  return text.substring(0, length);
}

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
];

/**
 * Generate random attachments
 */
function generateRandomAttachments(): PostEntity['attachments'] | undefined {
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

/**
 * Generate random title
 */
function generateRandomTitle(): string {
  const prefixes = [
    'Breaking:',
    'Update:',
    'Featured:',
    'Trending:',
    'New:',
    'Exclusive:',
    '',
  ];
  const topics = [
    'Tech Innovation',
    'Local News',
    'World Events',
    'Sports Update',
    'Entertainment',
    'Science Discovery',
    'Health Tips',
    'Business Report',
    'Travel Guide',
    'Food Review',
    'Lifestyle',
    'Politics',
    'Education',
    'Environment',
    'Culture',
    'Art',
    'Music',
    'Movie Review',
    'Book Review',
    'Product Launch',
    'Market Analysis',
    'Weather',
    'Community Event',
    'Interview',
    'Opinion',
    'Analysis',
    'Guide',
    'Tutorial',
  ];
  const suffixes = [
    'You Need to Know',
    'Today',
    'This Week',
    'in 2024',
    'Revealed',
    'Explained',
    '',
  ];

  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const topic = topics[Math.floor(Math.random() * topics.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];

  return `${prefix} ${topic} ${suffix}`.trim();
}

/**
 * Seed script to populate database with initial data
 * - Generates 10,000+ posts with varying content lengths
 */
async function runSeed() {
  const dataSource = new DataSource(dataSourceOptions);
  await dataSource.initialize();

  try {
    console.log('🌱 Starting seed...');

    const postRepository = dataSource.getRepository(PostEntity);

    // Clear existing posts
    console.log('🧹 Clearing existing posts...');
    await postRepository.clear();

    // Generate 10,000+ posts
    const totalPosts = 10000;
    const batchSize = 500;
    console.log(`📝 Generating ${totalPosts} posts...`);

    for (let batch = 0; batch < totalPosts / batchSize; batch++) {
      const posts: Partial<PostEntity>[] = [];

      for (let i = 0; i < batchSize; i++) {
        const contentLength = Math.floor(Math.random() * 1990) + 10; // 10 to 2000 characters
        posts.push({
          title: generateRandomTitle(),
          content: generateRandomText(10, contentLength),
          attachments: generateRandomAttachments(),
        });
      }

      await postRepository.save(posts);
      console.log(
        `  ✓ Batch ${batch + 1}/${totalPosts / batchSize} complete (${(batch + 1) * batchSize} posts)`,
      );
    }

    // Verify count
    const count = await postRepository.count();
    console.log(`\n✅ Seed complete! ${count} posts created.`);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await dataSource.destroy();
  }
}

// Run the seed
runSeed().catch((error) => {
  console.error('Seed error:', error);
  process.exit(1);
});
