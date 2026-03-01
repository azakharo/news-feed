# Architecture Design: NewsFeed Virtualized

## 1. Обзор системы

Приложение представляет собой высокопроизводительную ленту новостей с бесконечным скроллом, поиском и динамическим контентом.
Ключевой фокус: минимизация Layout Shift и эффективная виртуализация.

## 2. Бэкенд

### Стек бэкенда

- [NestJS](https://nestjs.com) (Node.js framework)
- [PostgreSQL](https://www.postgresql.org)
- [TypeORM](https://typeorm.io) (Data Mapper)
- TypeScript

### Данные и Слой доступа

- **Entity**: `Post` (uuid, title, content, attachments: jsonb, cursorId: bigint).
- **Pagination**: Seek Method (Cursor-based). Использование `cursorId` для стабильности выборки.
- **Search**: Фильтрация через `ILIKE` по полям title и content.

### API Layer

- `GET /posts?limit=20&cursor=ID&search=text`
- **Response**: `{ items: Post[], nextCursor: string | null, hasMore: boolean }`

### Сущность Post

Для реализации виртуализации важна стабильность ключей и предсказуемость размеров контента. Мы используем `UUID` для фронтенда и `BigInt` для эффективной пагинации.

```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, Generated } from 'typeorm';

@Entity('posts')
export class PostEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string; // Уникальный ключ для React list keys

  @Column()
  title: string;

  @Column({ type: 'text' })
  content: string; // Динамический текст разной длины

  /**
   * attachments: JSONB массив объектов медиа.
   * aspectRatio: критически важное поле для предотвращения Layout Shift.
   * Позволяет фронтенду рассчитать высоту блока до загрузки контента.
   */
  @Column({ type: 'jsonb', nullable: true })
  attachments: {
    type: 'image' | 'video';
    url: string;
    aspectRatio: number;
  }[];

  @CreateDateColumn()
  createdAt: Date;

  /**
   * cursorId: Техническое поле для Seek Pagination (Cursor-based).
   * Автоинкремент гарантирует, что новые записи не сдвинут выборку для пользователя.
   */
  @Index()
  @Generated('increment')
  @Column({ type: 'bigint', unique: true })
  cursorId: number;
}
```

### Механика пагинации и поиска

Используется Seek Method (Cursor-based).
Бэкенд возвращает nextCursor, который фронтенд передает в следующем запросе.
Логика запроса: `WHERE cursorId < :cursor AND (title ILIKE :search OR content ILIKE :search) ORDER BY cursorId DESC LIMIT :limit`

### Предлагаемая файловая структура для бекенда

backend/
├── src/
│   ├── posts/
│   │   ├── entities/
│   │   │   └── post.entity.ts
│   │   ├── dto/
│   │   │   └── get-posts.dto.ts
│   │   ├── posts.controller.ts
│   │   ├── posts.service.ts
│   │   └── posts.module.ts
│   ├── database/
│   │   └── seeder.service.ts # Генератор 10,000+ постов
│   └── app.module.ts
├── docker-compose.yaml       # Инфраструктура (Postgres)
└── package.json

## 3. Фронтенд

### Стек фронтенда

- [React.js](https://react.dev)
- TypeScript
- [Vite](https://vitejs.dev)
- [TanStack Query](https://tanstack.com) (Server State Management)
- [TanStack Virtual](https://tanstack.com) (Virtualization Engine).

### Слой данных (Server State)

- **TanStack Query (React Query)**:
  - `useInfiniteQuery` для управления кэшем страниц.
  - Синхронизация состояния поиска с запросами к API.

### Слой виртуализации (Virtualization Engine)

- **TanStack Virtual**:
  - `useVirtualizer` для расчета координат.
  - `measureElement`: динамический замер высоты каждой карточки после рендера.
  - `estimateSize`: функция предсказания высоты (например, расчет на основе наличия медиа в объекте поста).

#### Механика работы Virtual List

Мы используем библиотеку TanStack Virtual как математический фундамент.
Она предоставляет хук useVirtualizer, который рассчитывает офсеты на основе прокрутки.
Принцип работы:

- Scroll Container: Родительский div с фиксированной высотой и overflow-y: auto.
- Sizer (Phantom Element): Пустой блок внутри контейнера, высота которого равна суммарной высоте всех элементов. Создает корректную полосу прокрутки.
- Visible Window: Список элементов, абсолютно позиционированных внутри. Индексы вычисляются динамически на основе scrollTop.

```typescript
const rowVirtualizer = useVirtualizer({
  count: posts.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 400, // Начальная оценка высоты (для скелетонов)
  // Динамический замер реальной высоты DOM-узла после рендера:
  measureElement: (el) => el.getBoundingClientRect().height,
});
```

### Слой отображения (UI)

- **CSS Aspect Ratio**: Резервирование места под картинки до их загрузки (`aspect-ratio` из БД).
- **ResizeObserver**: Автоматическое уведомление виртуализатора об изменении размера (например, при раскрытии текста).

#### Борьба с Layout Shift (Слой отображения)

Чтобы виртуализатор не ошибался в расчетах при загрузке медиа, используем CSS свойство aspect-ratio на основе данных из БД.

```typescript
const PostCard = ({ post }) => {
  return (
    <div className="post-card">
      <h3>{post.title}</h3>
      {post.attachments.map(media => (
        <div
          key={media.url}
          style={{
            aspectRatio: `${media.aspectRatio}`, // Резервируем место мгновенно
            width: '100%',
            backgroundColor: '#eee'
          }}
        >
          <img src={media.url} loading="lazy" style={{ width: '100%', height: '100%' }} />
        </div>
      ))}
      <p>{post.content}</p>
    </div>
  );
};
```

### Предлагаемая файловая структура для фронтенда

frontend/
├── src/
│   ├── api/
│   │   └── client.ts         # Настройка Axios
│   ├── hooks/
│   │   └── useInfinitePosts.ts # Логика React Query
│   ├── components/
│   │   ├── Feed/             # Виртуализированный список
│   │   ├── PostCard/         # Карточка (Expand + ResizeObserver)
│   │   └── Search/           # Поиск с дебаунсом
│   ├── App.tsx
│   └── main.tsx
├── vite.config.ts
└── package.json
