import { Test, TestingModule } from '@nestjs/testing';
import { BookCategoryController } from './book-category.controller';
import { BookCategoryService } from './book-category.service';

describe('BookCategoryController', () => {
  let controller: BookCategoryController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookCategoryController],
      providers: [BookCategoryService],
    }).compile();

    controller = module.get<BookCategoryController>(BookCategoryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
