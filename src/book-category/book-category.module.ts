import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm'; // เพิ่มบรรทัดนี้
import { BookCategoryService } from './book-category.service';
import { BookCategoryController } from './book-category.controller';
import { BookCategory } from './entities/book-category.entity'; // เพิ่มบรรทัดนี้

@Module({
  imports: [TypeOrmModule.forFeature([BookCategory])], // เพิ่มบรรทัดนี้สำคัญมาก!
  controllers: [BookCategoryController],
  providers: [BookCategoryService],
})
export class BookCategoryModule {}
