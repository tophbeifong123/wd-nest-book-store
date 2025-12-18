import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BookCategory } from '../../book-category/entities/book-category.entity';

@Entity()
export class Book {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column()
  author: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column({ default: 0 })
  likeCount: number;

  // Relationship: Many Books belong to One Category
  @ManyToOne(() => BookCategory, (category) => category.id)
  category: BookCategory;

  @Column({ nullable: true })
  categoryId: string; // ใช้สำหรับบันทึกด้วย ID โดยตรง

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
