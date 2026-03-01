import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../../data-source';

/**
 * Seed script to populate database with initial data
 * - Admin user
 * - Test categories (with hierarchy)
 * - Test products
 */
async function runSeed() {
  const dataSource = new DataSource(dataSourceOptions);
  await dataSource.initialize();

  try {
    console.log('🌱 Starting seed...');

    // TODO Get repositories and populate them with data
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
