# Phase 4: Full Book Module & Relationships - สรุปขั้นตอนและการแก้ไข

## 🎯 เป้าหมาย

จัดการความสัมพันธ์ระหว่าง Entities (Book ต้องอยู่ภายใต้ Category) พร้อม Feature "Like"

---

## ขั้นตอนที่ 4.1: Generate Book Resource

### คำสั่งที่ควรรัน

```bash
nest g resource book
```

- เลือก: **REST API**
- CRUD entry points: **Yes**

### ⚠️ ปัญหาที่พบ

- PowerShell execution policy block การรันคำสั่ง `nest`

### ✅ วิธีแก้ไข

สร้างไฟล์ทั้งหมดด้วยตนเอง:

```
src/book/
├── book.controller.ts
├── book.module.ts
├── book.service.ts
├── dto/
│   ├── create-book.dto.ts
│   └── update-book.dto.ts
└── entities/
    └── book.entity.ts
```

---

## ขั้นตอนที่ 4.2: นิยาม Book Entity และ Relationship

### ไฟล์: `src/book/entities/book.entity.ts`

#### ✅ โค้ดที่สร้าง

```typescript
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
```

### อธิบาย Entity Properties

| Property     | Type         | Decorator                                         | คำอธิบาย                     |
| ------------ | ------------ | ------------------------------------------------- | ---------------------------- |
| `id`         | string       | `@PrimaryGeneratedColumn('uuid')`                 | Primary Key แบบ UUID         |
| `title`      | string       | `@Column()`                                       | ชื่อหนังสือ (required)       |
| `author`     | string       | `@Column()`                                       | ชื่อผู้แต่ง (required)       |
| `price`      | number       | `@Column('decimal', { precision: 10, scale: 2 })` | ราคา (ทศนิยม 2 ตำแหน่ง)      |
| `likeCount`  | number       | `@Column({ default: 0 })`                         | จำนวนไลค์ (default = 0)      |
| `category`   | BookCategory | `@ManyToOne()`                                    | ความสัมพันธ์กับ BookCategory |
| `categoryId` | string       | `@Column({ nullable: true })`                     | Foreign Key (UUID)           |
| `createdAt`  | Date         | `@CreateDateColumn()`                             | วันที่สร้าง (auto)           |
| `updatedAt`  | Date         | `@UpdateDateColumn()`                             | วันที่แก้ไข (auto)           |

### 🔗 ความสัมพันธ์ (Relationship)

#### Many-to-One: Book → BookCategory

```typescript
@ManyToOne(() => BookCategory, (category) => category.id)
category: BookCategory;
```

**ความหมาย:**

- **หลาย Books** สามารถอยู่ใน **หนึ่ง Category** เดียวกันได้
- ตัวอย่าง: "Clean Code", "The Pragmatic Programmer" อยู่ใน Category "Technology"

**การทำงาน:**

1. TypeORM จะสร้าง foreign key constraint
2. เมื่อ query Book พร้อม `relations: ['category']` จะได้ข้อมูล Category มาด้วย
3. `categoryId` ใช้สำหรับบันทึกข้อมูล

---

## ขั้นตอนที่ 4.3: สร้าง DTOs พร้อม Validation

### ไฟล์: `src/book/dto/create-book.dto.ts`

#### ✅ โค้ดที่สร้าง

```typescript
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsUUID,
  IsOptional,
} from 'class-validator';

export class CreateBookDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  author: string;

  @IsNumber()
  @IsNotEmpty()
  price: number;

  @IsUUID()
  @IsNotEmpty()
  categoryId: string;
}
```

### Validation Rules

| Field        | Decorators                     | กฎการตรวจสอบ               |
| ------------ | ------------------------------ | -------------------------- |
| `title`      | `@IsString()`, `@IsNotEmpty()` | ต้องเป็น string และไม่ว่าง |
| `author`     | `@IsString()`, `@IsNotEmpty()` | ต้องเป็น string และไม่ว่าง |
| `price`      | `@IsNumber()`, `@IsNotEmpty()` | ต้องเป็นตัวเลข             |
| `categoryId` | `@IsUUID()`, `@IsNotEmpty()`   | ต้องเป็น UUID format       |

### ไฟล์: `src/book/dto/update-book.dto.ts`

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateBookDto } from './create-book.dto';

export class UpdateBookDto extends PartialType(CreateBookDto) {}
```

- ใช้ `PartialType` ทำให้ทุก field เป็น optional
- รองรับ Partial Update

---

## ขั้นตอนที่ 4.4: Implement Service Methods

### ไฟล์: `src/book/book.service.ts`

#### ✅ โค้ดที่สร้าง

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { Book } from './entities/book.entity';

@Injectable()
export class BookService {
  constructor(
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,
  ) {}

  // สร้าง Book ใหม่
  async create(createBookDto: CreateBookDto) {
    return this.bookRepository.save(createBookDto);
  }

  // ดึงข้อมูล Book ทั้งหมด พร้อม Category
  async findAll() {
    return this.bookRepository.find({
      relations: ['category'],
    });
  }

  // ดึงข้อมูล Book ตาม ID พร้อม Category
  async findOne(id: string) {
    const book = await this.bookRepository.findOne({
      where: { id },
      relations: ['category'],
    });
    if (!book) {
      throw new NotFoundException(`Book with ID ${id} not found`);
    }
    return book;
  }

  // อัปเดต Book
  async update(id: string, updateBookDto: UpdateBookDto) {
    await this.findOne(id);
    await this.bookRepository.update(id, updateBookDto);
    return this.findOne(id);
  }

  // ลบ Book
  async remove(id: string) {
    const book = await this.findOne(id);
    await this.bookRepository.delete(id);
    return book;
  }

  // เพิ่มจำนวนไลค์
  async incrementLikes(id: string) {
    const book = await this.findOne(id);
    book.likeCount += 1;
    return this.bookRepository.save(book);
  }
}
```

### 🔑 จุดสำคัญ: Relations

#### ในการ Query

```typescript
// ❌ ไม่มี relations - จะไม่ได้ข้อมูล category
const book = await this.bookRepository.findOne({ where: { id } });

// ✅ มี relations - จะได้ข้อมูล category มาด้วย
const book = await this.bookRepository.findOne({
  where: { id },
  relations: ['category'],
});
```

#### ผลลัพธ์เมื่อมี relations:

```json
{
  "id": "...",
  "title": "Clean Code",
  "author": "Robert C. Martin",
  "price": 45.99,
  "likeCount": 0,
  "categoryId": "38971d8b-35c0-48d0-9a5e-9f542e1fa45b",
  "category": {
    "id": "38971d8b-35c0-48d0-9a5e-9f542e1fa45b",
    "name": "Technology",
    "description": "Computers and engineering"
  }
}
```

---

## ขั้นตอนที่ 4.5: Implement Logic "Like"

### ไฟล์: `src/book/book.controller.ts`

#### ✅ เพิ่ม Endpoint พิเศษสำหรับกดไลค์

```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { BookService } from './book.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';

@Controller('book')
export class BookController {
  constructor(private readonly bookService: BookService) {}

  @Post()
  create(@Body() createBookDto: CreateBookDto) {
    return this.bookService.create(createBookDto);
  }

  @Get()
  findAll() {
    return this.bookService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bookService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBookDto: UpdateBookDto) {
    return this.bookService.update(id, updateBookDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.bookService.remove(id);
  }

  // ✅ Endpoint พิเศษสำหรับกดไลค์
  @Patch(':id/like')
  async likeBook(@Param('id') id: string) {
    return this.bookService.incrementLikes(id);
  }
}
```

### การทำงานของ Like Feature

1. **Endpoint:** `PATCH /api/book/:id/like`
2. **Logic:**
   - ดึง Book จากฐานข้อมูล
   - เพิ่ม `likeCount` ขึ้น 1
   - บันทึกกลับเข้าฐานข้อมูล
3. **Response:** ส่งข้อมูล Book ที่อัปเดตแล้วกลับ

---

## ขั้นตอนที่ 4.6: Update AppModule

### ไฟล์: `src/app.module.ts`

#### ✅ ลงทะเบียน Book Entity และ BookModule

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookCategoryModule } from './book-category/book-category.module';
import { BookCategory } from './book-category/entities/book-category.entity';
import { BookModule } from './book/book.module';
import { Book } from './book/entities/book.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'admin',
      password: 'password123',
      database: 'bookstore_dev',
      entities: [BookCategory, Book], // ✅ ลงทะเบียนทั้ง 2 Entities
      synchronize: true,
    }),
    BookCategoryModule,
    BookModule, // ✅ Import BookModule
  ],
})
export class AppModule {}
```

### การเปลี่ยนแปลง

1. ✅ Import `BookModule` และ `Book` entity
2. ✅ เพิ่ม `Book` ใน `entities` array
3. ✅ เพิ่ม `BookModule` ใน `imports` array

---

## ขั้นตอนที่ 4.7: ทดสอบ Relationships

### 1. รัน Server

```bash
npm run start:dev
```

### 2. ดึง Category ID

```http
GET http://localhost:3000/api/book-category
```

**Response:**

```json
[
  {
    "id": "38971d8b-35c0-48d0-9a5e-9f542e1fa45b",
    "name": "Technology",
    "description": "Computers and engineering",
    ...
  }
]
```

คัดลอก `id` ของ Technology Category

---

## ✅ Final Checkpoint: การทดสอบทั้งหมด

### Test 1: สร้าง Book ใหม่

**Request:**

```http
POST http://localhost:3000/api/book
Content-Type: application/json

{
  "title": "Clean Code",
  "author": "Robert C. Martin",
  "price": 45.99,
  "categoryId": "38971d8b-35c0-48d0-9a5e-9f542e1fa45b"
}
```

**Expected Response: 201 Created**

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "title": "Clean Code",
  "author": "Robert C. Martin",
  "price": "45.99",
  "likeCount": 0,
  "categoryId": "38971d8b-35c0-48d0-9a5e-9f542e1fa45b",
  "createdAt": "2025-12-17T...",
  "updatedAt": "2025-12-17T..."
}
```

---

### Test 2: ดึงข้อมูล Book ทั้งหมด (พร้อม Category)

**Request:**

```http
GET http://localhost:3000/api/book
```

**Expected Response: 200 OK**

```json
[
  {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "title": "Clean Code",
    "author": "Robert C. Martin",
    "price": "45.99",
    "likeCount": 0,
    "categoryId": "38971d8b-35c0-48d0-9a5e-9f542e1fa45b",
    "category": {
      "id": "38971d8b-35c0-48d0-9a5e-9f542e1fa45b",
      "name": "Technology",
      "description": "Computers and engineering",
      "createdAt": "2025-12-16T...",
      "updatedAt": "2025-12-16T..."
    },
    "createdAt": "2025-12-17T...",
    "updatedAt": "2025-12-17T..."
  }
]
```

**✅ สังเกต:** มี object `category` ซ้อนอยู่ภายใน เพราะใช้ `relations: ['category']`

---

### Test 3: ดึงข้อมูล Book ตาม ID

**Request:**

```http
GET http://localhost:3000/api/book/a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

**Expected Response: 200 OK**

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "title": "Clean Code",
  "author": "Robert C. Martin",
  "price": "45.99",
  "likeCount": 0,
  "categoryId": "38971d8b-35c0-48d0-9a5e-9f542e1fa45b",
  "category": {
    "id": "38971d8b-35c0-48d0-9a5e-9f542e1fa45b",
    "name": "Technology",
    "description": "Computers and engineering"
  },
  "createdAt": "2025-12-17T...",
  "updatedAt": "2025-12-17T..."
}
```

---

### Test 4: เรียก Like Endpoint (ครั้งที่ 1)

**Request:**

```http
PATCH http://localhost:3000/api/book/a1b2c3d4-e5f6-7890-abcd-ef1234567890/like
```

**Expected Response: 200 OK**

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "title": "Clean Code",
  "author": "Robert C. Martin",
  "price": "45.99",
  "likeCount": 1,
  "categoryId": "38971d8b-35c0-48d0-9a5e-9f542e1fa45b",
  "category": {
    "id": "38971d8b-35c0-48d0-9a5e-9f542e1fa45b",
    "name": "Technology",
    "description": "Computers and engineering"
  }
}
```

**✅ สังเกต:** `likeCount` เพิ่มจาก 0 → 1

---

### Test 5: เรียก Like Endpoint อีก 2 ครั้ง

**Request (ครั้งที่ 2):**

```http
PATCH http://localhost:3000/api/book/a1b2c3d4-e5f6-7890-abcd-ef1234567890/like
```

**Expected:** `likeCount: 2`

**Request (ครั้งที่ 3):**

```http
PATCH http://localhost:3000/api/book/a1b2c3d4-e5f6-7890-abcd-ef1234567890/like
```

**Expected Response:**

```json
{
  ...
  "likeCount": 3,
  ...
}
```

**✅ สังเกต:** `likeCount` เพิ่มเป็น 3 หลังจากกด Like 3 ครั้ง

---

### Test 6: สร้าง Book หลายเล่มในหมวดหมู่เดียวกัน

**Request:**

```http
POST http://localhost:3000/api/book
Content-Type: application/json

{
  "title": "The Pragmatic Programmer",
  "author": "Andrew Hunt",
  "price": 39.99,
  "categoryId": "38971d8b-35c0-48d0-9a5e-9f542e1fa45b"
}
```

**Expected Response: 201 Created**

**Request:**

```http
POST http://localhost:3000/api/book
Content-Type: application/json

{
  "title": "Design Patterns",
  "author": "Gang of Four",
  "price": 54.99,
  "categoryId": "38971d8b-35c0-48d0-9a5e-9f542e1fa45b"
}
```

**Expected Response: 201 Created**

จากนั้น GET ทั้งหมด:

```http
GET http://localhost:3000/api/book
```

**Expected:** เห็น 3 Books ทั้งหมดในหมวด Technology

---

### Test 7: Validation - POST โดยไม่ใส่ categoryId

**Request:**

```http
POST http://localhost:3000/api/book
Content-Type: application/json

{
  "title": "Test Book",
  "author": "Test Author",
  "price": 10.00
}
```

**Expected Response: 400 Bad Request**

```json
{
  "statusCode": 400,
  "message": ["categoryId should not be empty", "categoryId must be a UUID"],
  "error": "Bad Request"
}
```

---

### Test 8: Validation - categoryId ไม่ใช่ UUID

**Request:**

```http
POST http://localhost:3000/api/book
Content-Type: application/json

{
  "title": "Test Book",
  "author": "Test Author",
  "price": 10.00,
  "categoryId": "not-a-uuid"
}
```

**Expected Response: 400 Bad Request**

```json
{
  "statusCode": 400,
  "message": ["categoryId must be a UUID"],
  "error": "Bad Request"
}
```

---

### Test 9: PATCH อัปเดตข้อมูล Book

**Request:**

```http
PATCH http://localhost:3000/api/book/a1b2c3d4-e5f6-7890-abcd-ef1234567890
Content-Type: application/json

{
  "price": 49.99
}
```

**Expected Response: 200 OK**

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "title": "Clean Code",
  "author": "Robert C. Martin",
  "price": "49.99",
  "likeCount": 3,
  ...
}
```

---

### Test 10: DELETE ลบ Book

**Request:**

```http
DELETE http://localhost:3000/api/book/a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

**Expected Response: 200 OK**

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "title": "Clean Code",
  ...
}
```

**Verify:**

```http
GET http://localhost:3000/api/book/a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

**Expected: 404 Not Found**

---

## 📋 สรุปการเปลี่ยนแปลงทั้งหมด

| #   | ไฟล์                 | การเปลี่ยนแปลง                                      | สถานะ |
| --- | -------------------- | --------------------------------------------------- | ----- |
| 1   | `book.entity.ts`     | สร้าง Book Entity พร้อม `@ManyToOne()` relationship | ✅    |
| 2   | `create-book.dto.ts` | สร้าง DTO พร้อม validation decorators               | ✅    |
| 3   | `update-book.dto.ts` | สร้าง PartialType DTO                               | ✅    |
| 4   | `book.service.ts`    | Implement CRUD + `relations: ['category']`          | ✅    |
| 5   | `book.service.ts`    | เพิ่ม `incrementLikes()` method                     | ✅    |
| 6   | `book.controller.ts` | สร้าง REST endpoints ทั้งหมด                        | ✅    |
| 7   | `book.controller.ts` | เพิ่ม `@Patch(':id/like')` endpoint                 | ✅    |
| 8   | `book.module.ts`     | ลงทะเบียน TypeOrmModule.forFeature([Book])          | ✅    |
| 9   | `app.module.ts`      | เพิ่ม Book entity และ BookModule                    | ✅    |

---

## 🔑 แนวคิดสำคัญที่ได้เรียนรู้

### 1. Entity Relationships

#### Many-to-One (หลายต่อหนึ่ง)

```typescript
// ในฝั่ง Book (Many)
@ManyToOne(() => BookCategory, (category) => category.id)
category: BookCategory;
```

**ตัวอย่างในชีวิตจริง:**

- หลายหนังสือ → หนึ่งหมวดหมู่
- หลายนักเรียน → หนึ่งห้องเรียน
- หลายพนักงาน → หนึ่งแผนก

### 2. Foreign Key Pattern

```typescript
@Column({ nullable: true })
categoryId: string; // เก็บ ID ของ Category
```

**ประโยชน์:**

- สามารถบันทึกได้โดยส่งแค่ `categoryId`
- ไม่ต้องโหลด Category object ทั้งหมด
- ประหยัด memory และ performance

### 3. Relations in Query

```typescript
// ✅ มี relations - ได้ข้อมูล category มาด้วย
find({ relations: ['category'] });

// ❌ ไม่มี relations - ได้แค่ book ไม่มี category
find();
```

### 4. Decimal Type สำหรับเงิน

```typescript
@Column('decimal', { precision: 10, scale: 2 })
price: number;
```

- `precision: 10` = รวมทศนิยมได้ 10 หลัก
- `scale: 2` = ทศนิยม 2 ตำแหน่ง
- ตัวอย่าง: 12345678.99

### 5. Custom Endpoint (Like Feature)

```typescript
@Patch(':id/like')  // /api/book/:id/like
async likeBook(@Param('id') id: string) {
  return this.bookService.incrementLikes(id);
}
```

**Pattern:** `/resource/:id/action`

---

## 🎓 บทสรุป Phase 4

Phase 4 ทำให้เราได้:

1. ✅ ความสัมพันธ์ระหว่าง Entities (Many-to-One)
2. ✅ การ Query พร้อม Relations เพื่อดึงข้อมูลที่เกี่ยวข้อง
3. ✅ Book CRUD API ที่สมบูรณ์
4. ✅ Feature พิเศษ (Like) ที่แยกออกเป็น Endpoint ของตัวเอง
5. ✅ Validation สำหรับ UUID และ required fields

**ผลลัพธ์:**

- ระบบ Bookstore API ที่มี 2 Entities เชื่อมต่อกัน
- สามารถสร้าง, อ่าน, แก้ไข, ลบหนังสือได้
- สามารถกด Like หนังสือได้
- สามารถดูข้อมูลหนังสือพร้อมหมวดหมู่ได้

---

## 📚 โครงสร้างไฟล์ทั้งหมด

```
src/
├── main.ts
├── app.module.ts                              # ✅ Import BookModule + Book Entity
├── book-category/
│   ├── book-category.controller.ts
│   ├── book-category.module.ts
│   ├── book-category.service.ts
│   ├── dto/
│   │   ├── create-book-category.dto.ts
│   │   └── update-book-category.dto.ts
│   └── entities/
│       └── book-category.entity.ts
└── book/                                      # ✅ NEW
    ├── book.controller.ts                     # ✅ CRUD + /like endpoint
    ├── book.module.ts                         # ✅ TypeOrmModule.forFeature([Book])
    ├── book.service.ts                        # ✅ CRUD + incrementLikes + relations
    ├── dto/
    │   ├── create-book.dto.ts                 # ✅ Validation
    │   └── update-book.dto.ts                 # ✅ PartialType
    └── entities/
        └── book.entity.ts                     # ✅ @ManyToOne relationship
```

---

## 🎯 ขั้นตอนถัดไป (ไม่รวมใน Lab นี้)

ถ้าต้องการพัฒนาต่อ:

1. เพิ่ม Search/Filter (ค้นหาหนังสือตามชื่อ, ผู้แต่ง)
2. เพิ่ม Pagination (แบ่งหน้า)
3. เพิ่ม File Upload สำหรับรูปปก
4. เพิ่ม Authentication/Authorization
5. เพิ่ม Unit Tests และ E2E Tests
6. Deploy ขึ้น Production

---

## ✅ Checklist ทั้งหมดสำหรับ Phase 4

- [x] สร้าง Book Entity พร้อม ManyToOne relationship
- [x] สร้าง Book DTOs พร้อม validation
- [x] Implement Book Service พร้อม CRUD methods
- [x] เพิ่ม `relations: ['category']` ใน findAll และ findOne
- [x] สร้าง Book Controller พร้อม endpoints
- [x] เพิ่ม `/like` endpoint พิเศษ
- [x] Implement `incrementLikes()` method
- [x] ลงทะเบียน Book Entity ใน app.module.ts
- [x] Import BookModule ใน app.module.ts
- [x] ทดสอบสร้าง Book พร้อม categoryId
- [x] ทดสอบ GET Book พร้อมเห็นข้อมูล Category
- [x] ทดสอบ Like endpoint และตรวจสอบ likeCount

**🎉 Phase 4 เสร็จสมบูรณ์!**
