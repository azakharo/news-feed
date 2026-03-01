import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, Generated } from 'typeorm';

@Entity('posts')
export class PostEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string; // UUID for React list keys

  @Column()
  title: string;

  @Column({ type: 'text' })
  content: string; // Dynamic text of varying length

  @Column({ type: 'jsonb', nullable: true })
  attachments: {
    type: 'image' | 'video';
    url: string;
    aspectRatio: number;
  }[];

  @CreateDateColumn()
  createdAt: Date;

  @Index()
  @Generated('increment')
  @Column({ type: 'bigint', unique: true })
  cursorId: number;
}
