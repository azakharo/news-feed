import { Module, Global } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import KeyvRedis from '@keyv/redis';

@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      useFactory: () => ({
        stores: [new KeyvRedis('redis://localhost:6379')],
        defaultTtl: 60000 * 5, // 5 минут
      }),
    }),
  ],
  exports: [NestCacheModule],
})
export class CacheModule {}
