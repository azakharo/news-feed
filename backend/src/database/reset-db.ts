import { dataSourceOptions } from '../data-source';
import { DataSource } from 'typeorm';

/**
 * Reset database - truncate all tables
 * Usage: npm run db:reset
 */

async function resetDatabase() {
  const dataSource = new DataSource(dataSourceOptions);
  await dataSource.initialize();

  try {
    console.log('🔄 Resetting database...\n');

    // TODO Truncate all tables
    // console.log('📋 Truncating tables...');

    // Close this connection before seed script runs
    await dataSource.destroy();

  } catch (error) {
    console.error('❌ Reset failed:', error);
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
    process.exit(1);
  }
}

// Run the reset
void resetDatabase();
