import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Загружаем переменные окружения из .env.test
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

const testDbConfig: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: 'postgres', // Connect to default postgres database to create test DB
};

async function createTestDatabase(): Promise<void> {
  const dataSource = new DataSource(testDbConfig);
  const testDatabaseName = process.env.DB_DATABASE || 'news_feed_test';

  await dataSource.initialize();

  try {
    // Check if database exists by querying pg_database

    const result: { length: number }[] = await dataSource.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [testDatabaseName],
    );

    if (!result.length) {
      // Create the test database
      await dataSource.query(`CREATE DATABASE ${testDatabaseName}`);
      console.log(
        `✅ Test database '${testDatabaseName}' created successfully`,
      );
    } else {
      console.log(`ℹ️ Test database '${testDatabaseName}' already exists`);
    }
  } catch (error) {
    console.error('❌ Failed to create test database:', error);
    throw error;
  } finally {
    await dataSource.destroy();
  }
}

createTestDatabase()
  .then(() => {
    console.log('🎉 Test database setup complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Setup failed:', error);
    process.exit(1);
  });
