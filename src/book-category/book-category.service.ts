import { Injectable, OnModuleInit, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateBookCategoryDto } from './dto/create-book-category.dto';
import { UpdateBookCategoryDto } from './dto/update-book-category.dto';
import { BookCategory } from './entities/book-category.entity';

@Injectable()
export class BookCategoryService implements OnModuleInit {
  constructor(
    @InjectRepository(BookCategory)
    private readonly repo: Repository<BookCategory>,
  ) {}

  async onModuleInit() {
    const count = await this.repo.count();
    if (count === 0) {
      console.log('Seeding Book Categories...');
      await this.repo.save([
        { name: 'Fiction', description: 'Stories and novels' },
        { name: 'Technology', description: 'Computers and engineering' },
        { name: 'History', description: 'Past events' },
      ]);
    }
  }

  async create(createBookCategoryDto: CreateBookCategoryDto) {
    return this.repo.save(createBookCategoryDto);
  }

  async findAll() {
    return this.repo.find();
  }

  async findOne(id: string) {
    const category = await this.repo.findOneBy({ id });
    if (!category) {
      throw new NotFoundException(`Book Category with ID ${id} not found`);
    }
    return category;
  }

  async update(id: string, updateBookCategoryDto: UpdateBookCategoryDto) {
    await this.findOne(id); // ตรวจสอบว่ามีอยู่จริง
    await this.repo.update(id, updateBookCategoryDto);
    return this.findOne(id);
  }

  async remove(id: string) {
    const category = await this.findOne(id);
    await this.repo.delete(id);
    return category;
  }
}
