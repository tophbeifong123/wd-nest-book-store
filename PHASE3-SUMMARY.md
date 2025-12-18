# Phase 3: Full Book Category Module - สรุปขั้นตอนและการแก้ไข

## 🎯 เป้าหมาย

พัฒนาระบบ CRUD ที่สมบูรณ์พร้อมการตรวจสอบข้อมูล (Validation)

---

## ขั้นตอนที่ 3.1: เพิ่ม Validation

### 1. ติดตั้ง Library สำหรับตรวจสอบข้อมูล

#### คำสั่งที่ต้องรัน

```bash
npm i --save class-validator class-transformer
```

#### ✅ สถานะ: สำเร็จ

- `class-validator`: ^0.14.3 ✅ ติดตั้งอยู่แล้ว
- `class-transformer`: ^0.5.1 ✅ ติดตั้งอยู่แล้ว

---

### 2. เปิดใช้งาน Global Validation

#### ไฟล์: `src/main.ts`

#### ❌ ก่อนแก้ไข

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  // ❌ ไม่มี ValidationPipe
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

#### ✅ หลังแก้ไข

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');

  // ✅ เปิดใช้งาน Global Validation
  app.useGlobalPipes(new ValidationPipe());

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

#### การเปลี่ยนแปลง

1. ✅ Import `ValidationPipe` จาก `@nestjs/common`
2. ✅ เพิ่ม `app.useGlobalPipes(new ValidationPipe())`

---

### 3. แก้ไข DTO เพื่อเพิ่ม Validation Rules

#### ไฟล์: `src/book-category/dto/create-book-category.dto.ts`

#### ❌ ก่อนแก้ไข

```typescript
export class CreateBookCategoryDto {}
```

#### ✅ หลังแก้ไข

```typescript
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateBookCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}
```

#### Validation Decorators ที่ใช้

| Decorator       | ความหมาย           | ใช้กับ                   |
| --------------- | ------------------ | ------------------------ |
| `@IsString()`   | ต้องเป็น string    | `name`, `description`    |
| `@IsNotEmpty()` | ต้องไม่เป็นค่าว่าง | `name` (required)        |
| `@IsOptional()` | ไม่บังคับต้องส่งมา | `description` (optional) |

---

## ขั้นตอนที่ 3.2: Implement Service Methods

### ไฟล์: `src/book-category/book-category.service.ts`

#### ❌ ก่อนแก้ไข

```typescript
@Injectable()
export class BookCategoryService implements OnModuleInit {
  // ... onModuleInit ...

  create(createBookCategoryDto: CreateBookCategoryDto) {
    return 'This action adds a new bookCategory'; // ❌ Placeholder
  }

  findAll() {
    return this.repo.find(); // ✅ ทำงานแล้ว
  }

  findOne(id: number) {
    // ❌ ใช้ number แทน string
    return `This action returns a #${id} bookCategory`; // ❌ Placeholder
  }

  update(id: number, updateBookCategoryDto: UpdateBookCategoryDto) {
    // ❌ number
    return `This action updates a #${id} bookCategory`; // ❌ Placeholder
  }

  remove(id: number) {
    // ❌ number
    return `This action removes a #${id} bookCategory`; // ❌ Placeholder
  }
}
```

#### ✅ หลังแก้ไข

```typescript
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

  // ✅ สร้างข้อมูลใหม่
  async create(createBookCategoryDto: CreateBookCategoryDto) {
    return this.repo.save(createBookCategoryDto);
  }

  // ✅ ดึงข้อมูลทั้งหมด
  async findAll() {
    return this.repo.find();
  }

  // ✅ ดึงข้อมูลตาม ID (UUID string)
  async findOne(id: string) {
    const category = await this.repo.findOneBy({ id });
    if (!category) {
      throw new NotFoundException(`Book Category with ID ${id} not found`);
    }
    return category;
  }

  // ✅ อัปเดตข้อมูล
  async update(id: string, updateBookCategoryDto: UpdateBookCategoryDto) {
    await this.findOne(id); // ตรวจสอบว่ามีอยู่จริง
    await this.repo.update(id, updateBookCategoryDto);
    return this.findOne(id); // ส่งข้อมูลที่อัปเดตแล้วกลับ
  }

  // ✅ ลบข้อมูล
  async remove(id: string) {
    const category = await this.findOne(id); // ตรวจสอบและเก็บก่อนลบ
    await this.repo.delete(id);
    return category; // ส่งข้อมูลที่ถูกลบกลับ
  }
}
```

### สรุป Repository Methods ที่ใช้

| Method             | ใช้ใน Service Method         | คำอธิบาย                  |
| ------------------ | ---------------------------- | ------------------------- |
| `repo.save()`      | `create()`, `onModuleInit()` | สร้างหรืออัปเดตข้อมูล     |
| `repo.find()`      | `findAll()`                  | ดึงข้อมูลทั้งหมด          |
| `repo.findOneBy()` | `findOne()`                  | ค้นหาข้อมูลด้วย condition |
| `repo.update()`    | `update()`                   | อัปเดตข้อมูลโดยตรง        |
| `repo.delete()`    | `remove()`                   | ลบข้อมูล                  |
| `repo.count()`     | `onModuleInit()`             | นับจำนวน records          |

### การเปลี่ยนแปลงที่สำคัญ

1. ✅ เปลี่ยนพารามิเตอร์ `id` จาก `number` เป็น `string` (เพราะใช้ UUID)
2. ✅ เพิ่ม `NotFoundException` เมื่อไม่พบข้อมูล
3. ✅ ทำให้ทุก method เป็น `async` functions
4. ✅ Implement logic ของแต่ละ CRUD operation

---

### 4. แก้ไข Controller

#### ไฟล์: `src/book-category/book-category.controller.ts`

#### ❌ ก่อนแก้ไข

```typescript
@Get(':id')
findOne(@Param('id') id: string) {
  return this.bookCategoryService.findOne(+id); // ❌ แปลงเป็น number
}

@Patch(':id')
update(@Param('id') id: string, @Body() updateBookCategoryDto: UpdateBookCategoryDto) {
  return this.bookCategoryService.update(+id, updateBookCategoryDto); // ❌
}

@Delete(':id')
remove(@Param('id') id: string) {
  return this.bookCategoryService.remove(+id); // ❌
}
```

#### ✅ หลังแก้ไข

```typescript
@Get(':id')
findOne(@Param('id') id: string) {
  return this.bookCategoryService.findOne(id); // ✅ ส่ง string UUID
}

@Patch(':id')
update(@Param('id') id: string, @Body() updateBookCategoryDto: UpdateBookCategoryDto) {
  return this.bookCategoryService.update(id, updateBookCategoryDto); // ✅
}

@Delete(':id')
remove(@Param('id') id: string) {
  return this.bookCategoryService.remove(id); // ✅
}
```

#### การเปลี่ยนแปลง

- ✅ ลบ `+id` (การแปลงเป็น number) เพราะใช้ UUID string

---

## ✅ Checkpoint: การทดสอบ

### 1. รัน Server

```bash
npm run start:dev
```

### 2. ทดสอบด้วย Postman

#### ✅ Test 1: POST ข้อมูลใหม่โดยไม่ใส่ชื่อ (ต้องได้ error 400)

**Request:**

```http
POST http://localhost:3000/api/book-category
Content-Type: application/json

{
  "description": "Test without name"
}
```

**Expected Response: 400 Bad Request**

```json
{
  "statusCode": 400,
  "message": ["name should not be empty", "name must be a string"],
  "error": "Bad Request"
}
```

#### ✅ Test 2: POST ข้อมูลที่ถูกต้อง

**Request:**

```http
POST http://localhost:3000/api/book-category
Content-Type: application/json

{
  "name": "Science Fiction",
  "description": "Futuristic and speculative stories"
}
```

**Expected Response: 201 Created**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440003",
  "name": "Science Fiction",
  "description": "Futuristic and speculative stories",
  "createdAt": "2025-12-17T10:30:00.000Z",
  "updatedAt": "2025-12-17T10:30:00.000Z"
}
```

#### ✅ Test 3: GET ทุก Categories

**Request:**

```http
GET http://localhost:3000/api/book-category
```

**Expected Response: 200 OK**

```json
[
  {
    "id": "...",
    "name": "Fiction",
    "description": "Stories and novels",
    "createdAt": "...",
    "updatedAt": "..."
  },
  {
    "id": "...",
    "name": "Technology",
    "description": "Computers and engineering",
    "createdAt": "...",
    "updatedAt": "..."
  },
  {
    "id": "...",
    "name": "History",
    "description": "Past events",
    "createdAt": "...",
    "updatedAt": "..."
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440003",
    "name": "Science Fiction",
    "description": "Futuristic and speculative stories",
    "createdAt": "...",
    "updatedAt": "..."
  }
]
```

#### ✅ Test 4: GET Category ตาม ID

**Request:**

```http
GET http://localhost:3000/api/book-category/550e8400-e29b-41d4-a716-446655440003
```

**Expected Response: 200 OK**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440003",
  "name": "Science Fiction",
  "description": "Futuristic and speculative stories",
  "createdAt": "2025-12-17T10:30:00.000Z",
  "updatedAt": "2025-12-17T10:30:00.000Z"
}
```

#### ✅ Test 5: GET Category ที่ไม่มีอยู่ (ต้องได้ error 404)

**Request:**

```http
GET http://localhost:3000/api/book-category/invalid-uuid-here
```

**Expected Response: 404 Not Found**

```json
{
  "statusCode": 404,
  "message": "Book Category with ID invalid-uuid-here not found",
  "error": "Not Found"
}
```

#### ✅ Test 6: PATCH แก้ไขชื่อหมวดหมู่

**Request:**

```http
PATCH http://localhost:3000/api/book-category/550e8400-e29b-41d4-a716-446655440003
Content-Type: application/json

{
  "name": "Sci-Fi",
  "description": "Science fiction and fantasy"
}
```

**Expected Response: 200 OK**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440003",
  "name": "Sci-Fi",
  "description": "Science fiction and fantasy",
  "createdAt": "2025-12-17T10:30:00.000Z",
  "updatedAt": "2025-12-17T10:35:00.000Z"
}
```

#### ✅ Test 7: PATCH อัปเดตบางส่วน (Partial update)

**Request:**

```http
PATCH http://localhost:3000/api/book-category/550e8400-e29b-41d4-a716-446655440003
Content-Type: application/json

{
  "description": "Updated description only"
}
```

**Expected Response: 200 OK**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440003",
  "name": "Sci-Fi",
  "description": "Updated description only",
  "createdAt": "2025-12-17T10:30:00.000Z",
  "updatedAt": "2025-12-17T10:36:00.000Z"
}
```

#### ✅ Test 8: DELETE ลบหมวดหมู่

**Request:**

```http
DELETE http://localhost:3000/api/book-category/550e8400-e29b-41d4-a716-446655440003
```

**Expected Response: 200 OK**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440003",
  "name": "Sci-Fi",
  "description": "Updated description only",
  "createdAt": "2025-12-17T10:30:00.000Z",
  "updatedAt": "2025-12-17T10:36:00.000Z"
}
```

#### ✅ Test 9: ตรวจสอบว่าถูกลบจริง

**Request:**

```http
GET http://localhost:3000/api/book-category/550e8400-e29b-41d4-a716-446655440003
```

**Expected Response: 404 Not Found**

```json
{
  "statusCode": 404,
  "message": "Book Category with ID 550e8400-e29b-41d4-a716-446655440003 not found",
  "error": "Not Found"
}
```

---

## 📋 สรุปการเปลี่ยนแปลงทั้งหมด

| #   | ไฟล์                          | การเปลี่ยนแปลง                                                 | สถานะ         |
| --- | ----------------------------- | -------------------------------------------------------------- | ------------- |
| 1   | `package.json`                | ติดตั้ง class-validator, class-transformer                     | ✅ มีอยู่แล้ว |
| 2   | `main.ts`                     | เพิ่ม `ValidationPipe`                                         | ✅            |
| 3   | `create-book-category.dto.ts` | เพิ่ม validation decorators                                    | ✅            |
| 4   | `book-category.service.ts`    | Implement `create()` ด้วย `repo.save()`                        | ✅            |
| 5   | `book-category.service.ts`    | Implement `findOne()` ด้วย `repo.findOneBy()` + error handling | ✅            |
| 6   | `book-category.service.ts`    | Implement `update()` ด้วย `repo.update()`                      | ✅            |
| 7   | `book-category.service.ts`    | Implement `remove()` ด้วย `repo.delete()`                      | ✅            |
| 8   | `book-category.service.ts`    | เปลี่ยน parameter `id` จาก `number` เป็น `string`              | ✅            |
| 9   | `book-category.controller.ts` | ลบ `+id` ออก (เปลี่ยนจาก number เป็น string)                   | ✅            |

---

## 🔑 แนวคิดสำคัญที่ได้เรียนรู้

### 1. Validation Pipeline

- **Global Validation**: ใช้ `ValidationPipe` ที่ระดับ application
- **DTO Validation**: ใช้ decorators จาก `class-validator`
- **Automatic Error Response**: NestJS จัดการ error response อัตโนมัติ

### 2. CRUD Operations

```typescript
// CREATE
await repo.save(data);

// READ
await repo.find(); // ทั้งหมด
await repo.findOneBy({ id }); // ตาม condition

// UPDATE
await repo.update(id, data); // อัปเดตโดยตรง

// DELETE
await repo.delete(id); // ลบโดยตรง
```

### 3. Error Handling

- `NotFoundException`: ส่ง 404 เมื่อไม่พบข้อมูล
- Validation errors: ส่ง 400 อัตโนมัติโดย `ValidationPipe`

### 4. Partial Update

- `UpdateBookCategoryDto` รองรับ partial update
- ใช้ `@nestjs/mapped-types` เพื่อ extends จาก `CreateDto`

---

## 🎓 บทสรุป Phase 3

Phase 3 ทำให้เราได้:

1. ✅ ระบบ Validation ที่ตรวจสอบข้อมูลอัตโนมัติ
2. ✅ CRUD Operations ที่สมบูรณ์ (Create, Read, Update, Delete)
3. ✅ Error Handling ที่เหมาะสม (404 Not Found, 400 Bad Request)
4. ✅ API ที่พร้อมใช้งานจริงและทดสอบได้ทันที

**ผลลัพธ์:** Book Category API ที่มี validation, error handling และ CRUD operations ครบถ้วน พร้อมทดสอบด้วย Postman ได้เลย! 🚀

---

## 📚 ไฟล์ที่เกี่ยวข้องทั้งหมด

```
src/
├── main.ts                                    # ✅ ValidationPipe
├── book-category/
│   ├── book-category.controller.ts            # ✅ ลบ +id
│   ├── book-category.service.ts               # ✅ Full CRUD implementation
│   └── dto/
│       ├── create-book-category.dto.ts        # ✅ Validation decorators
│       └── update-book-category.dto.ts        # ✅ PartialType
```

---

## 🔜 ต่อไปคือ Phase 4: Book Module & Relationships

ในขั้นต่อไป เราจะ:

- สร้าง Book Entity และ Module
- สร้างความสัมพันธ์ระหว่าง Book และ BookCategory (Many-to-One)
- Implement "Like" feature
- ทดสอบ Relations ใน API
