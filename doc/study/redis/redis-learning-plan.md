# План обучения: Redis для кэширования и хранения сессий

## Обзор

Redis — это in-memory data structure store, который используется как база данных, кэш и message broker. В контексте нашего приложения NewsFeed мы изучим Redis для:

- Кэширования часто запрашиваемых данных (посты, ленты)
- Хранения сессий пользователей
- Реализации rate limiting

---

## Часть 1: Теория

### 1.1 Основы Redis

#### Что такое Redis и почему он нужен

Redis (Remote Dictionary Server) — это высокопроизводительное in-memory хранилище данных с опциональной персистентностью. Ключевые преимущества:

- **Скорость**: Данные хранятся в памяти, время отклика ~1-5ms
- **Гибкие структуры данных**: Strings, Hashes, Lists, Sets, Sorted Sets, Bitmaps, HyperLogLog, Geospatial indexes, Streams
- **Персистентность**: RDB snapshots и AOF (Append-Only File)
- **Репликация**: Master-Slave репликация и Redis Sentinel для HA
- **Кластеризация**: Redis Cluster для горизонтального масштабирования

#### Основные структуры данных Redis

| Тип данных | Команды               | Пример использования               |
|:--------------------|:-----------------------------|:------------------------------------------------------|
| **String**          | GET, SET, INCR, DECR, EXPIRE | Счётчики, простой кэш, сессии |
| **Hash**            | HGET, HSET, HGETALL          | Объекты, кэш постов                   |
| **List**            | LPUSH, RPUSH, LRANGE, LTRIM  | Очереди, ленты новостей           |
| **Set**             | SADD, SMEMBERS, SISMEMBER    | Уникальные значения, теги       |
| **Sorted Set**      | ZADD, ZRANGE, ZRANGEBYSCORE  | Рейтинги, лидерборды                |
| **Pub/Sub**         | PUBLISH, SUBSCRIBE           | Real-time уведомления                      |

#### Команды для работы с TTL (Time-To-Live)

```bash
# Установка TTL в секундах
EXPIRE key 300

# Проверка TTL
TTL key

# Установка сразу с TTL (мгновенный expire)
SETEX key 300 "value"

# Удаление TTL (сделать перманентным)
PERSIST key
```

TTL возвращает:
- `-1` — ключ существует, но не имеет TTL
- `-2` — ключ не существует
- `n` — оставшееся время в секундах

### 1.2 Redis в NestJS

#### Установка пакетов

```bash
npm install @nestjs/cache-manager cache-manager @keyv/redis keyv
```

#### Конфигурация CacheModule (NestJS v11+)

```typescript
// src/cache/cache.module.ts
import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import KeyvRedis from '@keyv/redis';

@Module({
  imports: [
    CacheModule.registerAsync({
      useFactory: async () => ({
        stores: [
          new KeyvRedis('redis://localhost:6379'),
        ],
        defaultTtl: 60000, // 1 минута по умолчанию
      }),
    }),
  ],
  exports: [CacheModule],
})
export class CacheModule {}
```

#### Использование CacheInterceptor

```typescript
// Глобальный интерцептор для всех GET запросов
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CacheInterceptor } from '@nestjs/cache-manager';

@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheInterceptor,
    },
  ],
})
export class AppModule {}
```

```typescript
// Локальное применение к контроллеру
@Controller('posts')
@UseInterceptors(CacheInterceptor)
export class PostsController {
  @Get()
  findAll() {
    // Результаты будут автоматически кэшироваться
    return this.postsService.findAll();
  }
}
```

#### Ручное управление кэшем

```typescript
import { Injectable } from '@nestjs/common';
import { InjectCache } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class PostsCacheService {
  constructor(@InjectCache() private cache: Cache) {}

  async getPosts(key: string) {
    return this.cache.get(`posts:${key}`);
  }

  async setPosts(key: string, value: any, ttl: number = 300000) {
    // ttl в миллисекундах (5 минут)
    return this.cache.set(`posts:${key}`, value, ttl);
  }

  async invalidatePosts(pattern: string) {
    // Для полной очистки нужен кастомный Keyv адаптер
    return this.cache.reset();
  }
}
```

### 1.3 Паттерны кэширования

#### Cache-Aside (Lazy Loading)

```
1. Приложение запрашивает данные
2. Проверяем кэш
3. Если есть в кэше → возвращаем из кэша
4. Если нет → загружаем из БД, сохраняем в кэш, возвращаем
```

**Преимущества**: Простота, данные загружаются только по запросу
**Недостатки**: Первый запрос медленный (cache miss), нужно invalidation

#### Write-Through

```
1. При записи данных
2. Сначала записываем в БД
3. Затем обновляем кэш
```

**Преимущества**: Кэш всегда актуален
**Недостатки**: Задержки при записи

#### Cache Invalidation

Проблема: Как синхронизировать кэш с БД?

- **TTL-based**: Простой, но данные могут быть устаревшими
- **Event-based**: При обновлении в БД → отправляем событие → инвалидируем кэш
- **Versioning**: Ключ содержит версию, при обновлении меняем версию

### 1.4 Redis для сессий

#### Концепция сессий в REST API

В RESTful приложениях традиционно используется stateless аутентификация с JWT. Однако сессии всё ещё актуальны для:

- Более длительные сессии (банковские приложения)
- Серверный контроль сессий (принудительный logout)
- Защита от XSS (HttpOnly cookies)

#### Redis Session Store

```bash
npm install @liaoliaots/nestjs-redis @nestjs/passport passport passport-local express-session
```

---

## Часть 2: Практические задачи

### Задача 1: Подготовка инфраструктуры

**Цель**: Добавить Redis в docker-compose и настроить подключение

**Шаг 1.1**: Добавление Redis в docker-compose.yml

```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    container_name: news_feed_postgres
    restart: always
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: news_feed_db
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    container_name: news_feed_redis
    restart: always
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

volumes:
  postgres_data:
  redis_data:
```

**Шаг 1.2**: Проверка что Redis запускается

```powershell
docker-compose up -d redis
docker exec -it news_feed_redis redis-cli ping
# Ожидаемый ответ: PONG
```

### Задача 2: Кэширование списка постов

**Цель**: Реализовать кэширование для endpoint `/posts` с использованием Redis

**Шаг 2.1**: Создание модуля кэширования

```typescript
// src/cache/cache.module.ts
import { Module, Global } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import KeyvRedis from '@keyv/redis';

@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      useFactory: async () => ({
        stores: [
          new KeyvRedis('redis://localhost:6379'),
        ],
        defaultTtl: 60000 * 5, // 5 минут
      }),
    }),
  ],
  exports: [NestCacheModule],
})
export class CacheModule {}
```

**Шаг 2.2**: Интеграция кэша в PostsService

```typescript
// src/posts/posts.service.ts (модифицированный)
import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { Cache } from 'cache-manager';
import { PostEntity } from '../entities/post.entity';
import { GetPostsDto } from './dto/get-posts.dto';
import { PostResponseDto } from './dto/post-response.dto';
import { GetNewCountDto } from './dto/get-new-count.dto';

const CACHE_TTL = 300000; // 5 минут

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(PostEntity)
    private readonly postRepository: Repository<PostEntity>,
    @Inject('CACHE_MANAGER')
    private readonly cacheManager: Cache,
  ) {}

  private generateCacheKey(prefix: string, params: Record<string, any>): string {
    return `${prefix}:${JSON.stringify(params)}`;
  }

  async findPosts(query: GetPostsDto): Promise<PostResponseDto> {
    const cacheKey = this.generateCacheKey('posts:list', query);

    // Пробуем получить из кэша
    const cached = await this.cacheManager.get<PostResponseDto>(cacheKey);
    if (cached) {
      return cached;
    }

    // Логика получения из БД
    const { limit = 20, cursor, search } = query;
    const qb = this.postRepository.createQueryBuilder('post');

    if (cursor) {
      const cursorId = parseInt(cursor, 10);
      if (!isNaN(cursorId)) {
        qb.where('post.cursorId < :cursorId', { cursorId });
      }
    }

    if (search) {
      const searchPattern = `%${search}%`;
      qb.andWhere(
        new Brackets((qb2) => {
          qb2
            .where('post.title ILIKE :search', { search: searchPattern })
            .orWhere('post.content ILIKE :search', { search: searchPattern });
        }),
      );
    }

    qb.orderBy('post.cursorId', 'DESC').take(limit + 1);

    const results = await qb.getMany();
    const hasMore = results.length > limit;
    const items = hasMore ? results.slice(0, limit) : results;

    const nextCursor =
      hasMore && items.length > 0
        ? items[items.length - 1].cursorId.toString()
        : null;

    const response: PostResponseDto = {
      items,
      nextCursor,
      hasMore,
    };

    // Сохраняем в кэш
    await this.cacheManager.set(cacheKey, response, CACHE_TTL);

    return response;
  }

  // Инвалидация кэша при создании/обновлении поста
  async invalidatePostsCache(): Promise<void> {
    // Для простоты очищаем весь кэш posts
    // В продакшене использовать паттерн с версионированием
    await this.cacheManager.del('posts:list');
  }
}
```

### Задача 3: Кэширование счётчика новых постов

**Цель**: Кэшировать endpoint `/posts/new-count` для уменьшения нагрузки на БД

```typescript
// src/posts/posts.service.ts (добавление метода)
async getNewCount(
  query: GetNewCountDto,
): Promise<{ count: number; latestCursor: string | null }> {
  const cacheKey = this.generateCacheKey('posts:new-count', query);

  const cached = await this.cacheManager.get<{ count: number; latestCursor: string | null }>(cacheKey);
  if (cached) {
    return cached;
  }

  const { sinceCursor, search } = query;
  const sinceCursorId = parseInt(sinceCursor, 10);

  if (isNaN(sinceCursorId)) {
    return { count: 0, latestCursor: null };
  }

  const qb = this.postRepository.createQueryBuilder('post');
  qb.where('post.cursorId > :sinceCursorId', { sinceCursorId });

  if (search) {
    const searchPattern = `%${search}%`;
    qb.andWhere(
      new Brackets((qb2) => {
        qb2
          .where('post.title ILIKE :search', { search: searchPattern })
          .orWhere('post.content ILIKE :search', { search: searchPattern });
      }),
    );
  }

  const result = await qb
    .select('COUNT(*)', 'count')
    .addSelect('MAX(post.cursorId)', 'latestCursor')
    .getRawOne<{ count: string; latestCursor: string | null }>();

  const response = {
    count: parseInt(result?.count || '0', 10),
    latestCursor: result?.latestCursor || null,
  };

  // Кэшируем на 30 секунд (более частые запросы)
  await this.cacheManager.set(cacheKey, response, 30000);

  return response;
}
```

### Задача 4: Реализация Rate Limiting с Redis

**Цель**: Защитить API от злоупотреблений, используя Redis для подсчёта запросов

**Шаг 4.1**: Установка пакета

```bash
npm install @nestjs/throttler
```

**Шаг 4.2**: Конфигурация с Redis storage

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PostsModule } from './posts/posts.module';
import { dataSourceOptions } from './data-source';

@Module({
  imports: [
    TypeOrmModule.forRoot(dataSourceOptions),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,   // 1 секунда
        limit: 3,    // 3 запроса в секунду
      },
      {
        name: 'medium',
        ttl: 60000,  // 1 минута
        limit: 100,  // 100 запросов в минуту
      },
      {
        name: 'long',
        ttl: 3600000, // 1 час
        limit: 1000,  // 1000 запросов в час
      },
    ]),
    PostsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

**Шаг 4.3**: Использование в контроллере

```typescript
// src/posts/posts.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { PostsService } from './posts.service';
import { GetPostsDto } from './dto/get-posts.dto';
import { GetNewCountDto } from './dto/get-new-count.dto';

@Controller('posts')
@UseGuards(ThrottlerGuard)
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  async findPosts(@Query() query: GetPostsDto) {
    return this.postsService.findPosts(query);
  }

  @Get('new-count')
  async getNewCount(@Query() query: GetNewCountDto) {
    return this.postsService.getNewCount(query);
  }
}
```

### Задача 5: Хранение сессий пользователей (дополнительно)

**Цель**: Понять как хранить сессии в Redis для будущей реализации аутентификации

```typescript
// Установка
npm install @liaoliaots/nestjs-redis nestjs-session

// src/session/session.module.ts
import { Module } from '@nestjs/common';
import { NestjsRedisModule } from '@liaoliaots/nestjs-redis';
import session from 'express-session';

@Module({
  imports: [
    NestjsRedisModule.forRoot({
      config: {
        url: 'redis://localhost:6379',
      },
    }),
  ],
  providers: [
    {
      provide: 'SESSION_SERIALIZER',
      useValue: session({
        store: new (require('connect-redis'))(session),
        secret: 'your-secret-key',
        resave: false,
        saveUninitialized: false,
        cookie: {
          secure: false, // true в production с HTTPS
          httpOnly: true,
          maxAge: 86400000, // 24 часа
        },
      }),
    },
  ],
})
export class SessionModule {}
```

---

## Часть 3: Проверка знаний

### Вопросы для самопроверки

1. **Какие типы данных есть в Redis и для каких задач они используются?**
2. **Что такое TTL и как его использовать?**
3. **В чём разница между Cache-Aside и Write-Through паттернами?**
4. **Как работает CacheInterceptor в NestJS?**
5. **Зачем нужен rate limiting и как Redis помогает в его реализации?**
6. **Какие проблемы могут возникнуть с кэшированием и как их решать (cache invalidation)?**

### Практические задания для закрепления

1. **Измерить производительность**: Сравнить время отклика `/posts` с кэшем и без
2. **Инвалидация кэша**: Добавить метод `invalidatePostsCache()` и вызвать его при создании нового поста
3. **Настроить TTL**: Попробовать разные значения TTL (30 сек, 5 мин, 1 час) и сравнить поведение
4. **Redis CLI**: Поработать с Redis напрямую через `docker exec -it news_feed_redis redis-cli`

---

## Ресурсы для изучения

### Официальная документация

- [Redis Documentation](https://redis.io/docs/)
- [NestJS Caching](https://docs.nestjs.com/techniques/caching)
- [NestJS Throttler](https://docs.nestjs.com/security/throttling)

### Команды Redis для практики

```bash
# Строки
SET mykey "Hello"
GET mykey
SETEX mykey 10 "Hello"  # с TTL 10 секунд

# Хэши
HSET user:1 name "John" age 30
HGETALL user:1

# Списки
LPUSH mylist "first"
RPUSH mylist "second"
LRANGE mylist 0 -1

# Множества
SADD tags "react" "nestjs" "typescript"
SMEMBERS tags
SISMEMBER tags "react"

# TTL
EXPIRE mykey 60
TTL mykey

# Мониторинг
INFO
MEMORY STATS
```

---

## Следующие шаги

После освоения Redis рекомендуется перейти к изучению:

1. **RabbitMQ** — для асинхронных сообщений и микросервисной архитектуры
2. **Docker и Docker Compose** — для контейнеризации всего стека (App + Postgres + Redis + RabbitMQ)
3. **CI/CD** — для автоматизации部署

---

## Примечание

В текущем приложении NewsFeed мы реализовали:
- Cursor-based pagination для постов
- Search по title и content
- Соответствующие endpoints: `GET /posts`, `GET /posts/new-count`

Эти endpoints идеально подходят для демонстрации кэширования, так как:
- Списки постов запрашиваются часто
- Данные меняются не очень часто
- Есть clear invalidation strategy (при создании поста)
