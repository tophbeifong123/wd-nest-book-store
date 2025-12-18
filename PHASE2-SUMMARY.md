# Phase 2: Book Category Module (Basic) - สรุปขั้นตอนและการแก้ไข

## 🎯 เป้าหมาย

เรียนรู้การสร้าง Entity และการโหลดข้อมูลตัวอย่าง (Fixtures)

---

## ขั้นตอนที่ 2.1: Generate Resource

### คำสั่งที่ต้องรัน

```bash
nest g resource book-category
```

- เลือก: **REST API**
- CRUD entry points: **Yes**

### ไฟล์ที่ถูกสร้างอัตโนมัติ

```
src/book-category/
├── book-category.controller.spec.ts
├── book-category.controller.ts
├── book-category.module.ts
├── book-category.service.spec.ts
├── book-category.service.ts
├── dto/
│   ├── create-book-category.dto.ts
│   └── update-book-category.dto.ts
└── entities/
    └── book-category.entity.ts
```

### ✅ สถานะ: สำเร็จ

- โครงสร้างไฟล์ครบถ้วน

---

## ขั้นตอนที่ 2.2: นิยาม Entity

### ไฟล์: `src/book-category/entities/book-category.entity.ts`

#### ✅ โค้ดที่ถูกต้อง (มีอยู่แล้ว)

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class BookCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### การลงทะเบียน Entity ใน Module

#### ไฟล์: `src/book-category/book-category.module.ts`

#### ✅ โค้ดที่ถูกต้อง (มีอยู่แล้ว)

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookCategoryService } from './book-category.service';
import { BookCategoryController } from './book-category.controller';
import { BookCategory } from './entities/book-category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BookCategory])],
  controllers: [BookCategoryController],
  providers: [BookCategoryService],
})
export class BookCategoryModule {}
```

### ✅ สถานะ: สำเร็จ

- Entity มี schema ครบถ้วน
- ลงทะเบียนใน Module แล้ว

---

## ขั้นตอนที่ 2.3: สร้าง Data Seeding (Fixtures)

### ไฟล์: `src/book-category/book-category.service.ts`

#### ❌ ปัญหาที่พบ (ตอนแรก)

```typescript
@Injectable()
export class BookCategoryService {
  // ❌ ไม่มี Repository injection
  // ❌ ไม่มี onModuleInit hook

  findAll() {
    return `This action returns all bookCategory`; // ❌ เป็น string ธรรมดา
  }
}
```

#### ✅ โค้ดที่ถูกต้อง (แก้ไขแล้ว)

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
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

  // ✅ Data Seeding Hook
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

  // ✅ Query จากฐานข้อมูลจริง
  findAll() {
    return this.repo.find();
  }

  // ... methods อื่นๆ
}
```

### การแก้ไขที่ต้องทำ

1. ✅ เพิ่ม `OnModuleInit` interface
2. ✅ Inject `Repository<BookCategory>` ด้วย `@InjectRepository()`
3. ✅ สร้าง `onModuleInit()` method สำหรับ seeding
4. ✅ แก้ไข `findAll()` จาก string เป็น `this.repo.find()`

---

## ⚙️ การตั้งค่าเพิ่มเติมที่จำเป็น

### ไฟล์: `src/app.module.ts`

#### ❌ ปัญหาที่พบ (ตอนแรก)

```typescript
@Module({
  imports: [
    TypeOrmModule.forRoot({
      // ...
      entities: [], // ❌ Array ว่าง -> เกิด EntityMetadataNotFoundError
    }),
    // ❌ ไม่มี BookCategoryModule
  ],
})
export class AppModule {}
```

#### ✅ โค้ดที่ถูกต้อง (แก้ไขแล้ว)

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookCategoryModule } from './book-category/book-category.module';
import { BookCategory } from './book-category/entities/book-category.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'admin',
      password: 'password123',
      database: 'bookstore_dev',
      entities: [BookCategory], // ✅ ลงทะเบียน Entity
      synchronize: true,
    }),
    BookCategoryModule, // ✅ Import Module
  ],
})
export class AppModule {}
```

### การแก้ไขที่ต้องทำ

1. ✅ เพิ่ม `BookCategory` ใน `entities` array
2. ✅ Import `BookCategoryModule` ใน imports

---

### ไฟล์: `src/main.ts`

#### ❌ ปัญหาที่พบ (ตอนแรก)

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // ❌ ไม่มี global prefix -> ทำให้ /api/book-category ไม่ทำงาน
  await app.listen(3000);
}
```

#### ✅ โค้ดที่ถูกต้อง (แก้ไขแล้ว)

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ✅ เพิ่ม Global Prefix
  app.setGlobalPrefix('api');

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

### การแก้ไขที่ต้องทำ

1. ✅ เพิ่ม `app.setGlobalPrefix('api')` เพื่อให้ทุก endpoint เริ่มด้วย `/api`

---

## 📋 สรุปปัญหาและการแก้ไขทั้งหมด

| #   | ไฟล์                       | ปัญหา                         | การแก้ไข                           | สถานะ |
| --- | -------------------------- | ----------------------------- | ---------------------------------- | ----- |
| 1   | `book-category.service.ts` | ไม่มี Repository injection    | เพิ่ม `@InjectRepository()`        | ✅    |
| 2   | `book-category.service.ts` | ไม่มี `onModuleInit`          | Implement `OnModuleInit` interface | ✅    |
| 3   | `book-category.service.ts` | `findAll()` return string     | แก้เป็น `this.repo.find()`         | ✅    |
| 4   | `app.module.ts`            | `entities: []` ว่างเปล่า      | เพิ่ม `[BookCategory]`             | ✅    |
| 5   | `app.module.ts`            | ไม่ import BookCategoryModule | เพิ่มใน imports array              | ✅    |
| 6   | `main.ts`                  | ไม่มี global prefix           | เพิ่ม `app.setGlobalPrefix('api')` | ✅    |

---

## ✅ Checkpoint: การทดสอบ

### 1. รัน Server

```bash
npm run start:dev
```

### 2. ตรวจสอบ Log

```
[Nest] LOG [NestFactory] Starting Nest application...
[Nest] LOG [InstanceLoader] TypeOrmModule dependencies initialized
Seeding Book Categories...  # ✅ ต้องเห็นบรรทัดนี้
[Nest] LOG Application is running on: http://[::1]:3000
```

### 3. ทดสอบ API

```
GET http://localhost:3000/api/book-category
```

### 4. ผลลัพธ์ที่คาดหวัง

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Fiction",
    "description": "Stories and novels",
    "createdAt": "2025-12-17T10:00:00.000Z",
    "updatedAt": "2025-12-17T10:00:00.000Z"
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "Technology",
    "description": "Computers and engineering",
    "createdAt": "2025-12-17T10:00:00.000Z",
    "updatedAt": "2025-12-17T10:00:00.000Z"
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "name": "History",
    "description": "Past events",
    "createdAt": "2025-12-17T10:00:00.000Z",
    "updatedAt": "2025-12-17T10:00:00.000Z"
  }
]
```

---

## 🔑 แนวคิดสำคัญที่ได้เรียนรู้

### 1. Entity Registration (การลงทะเบียน Entity)

- ✅ ต้องลงทะเบียนใน **Module ระดับ Feature** (`TypeOrmModule.forFeature([Entity])`)
- ✅ ต้องลงทะเบียนใน **Module ระดับ Root** (`entities: [Entity]` ใน `forRoot()`)

### 2. Repository Pattern

- ใช้ `@InjectRepository(Entity)` เพื่อ inject Repository
- Repository มี methods พื้นฐาน: `find()`, `findOne()`, `save()`, `update()`, `delete()`, `count()`

### 3. Lifecycle Hooks

- `OnModuleInit`: เรียกทำงานเมื่อ Module ถูก initialize
- เหมาะสำหรับ Data Seeding ในสภาพแวดล้อม Development

### 4. Global Prefix

- `app.setGlobalPrefix('api')` ทำให้ทุก endpoint เริ่มด้วย `/api`
- Controller `@Controller('book-category')` จะกลายเป็น `/api/book-category`

---

## 📚 ไฟล์สำคัญทั้งหมดที่เกี่ยวข้อง

```
src/
├── main.ts                                    # ✅ เพิ่ม global prefix
├── app.module.ts                              # ✅ Import BookCategoryModule + entities
└── book-category/
    ├── book-category.controller.ts            # ✅ มี @Controller('book-category')
    ├── book-category.module.ts                # ✅ TypeOrmModule.forFeature([BookCategory])
    ├── book-category.service.ts               # ✅ Repository injection + onModuleInit
    ├── dto/
    │   ├── create-book-category.dto.ts
    │   └── update-book-category.dto.ts
    └── entities/
        └── book-category.entity.ts            # ✅ @Entity() with UUID
```

---

## 🎓 บทสรุป

Phase 2 สอนให้เราเข้าใจ:

1. ✅ การสร้าง REST API Resource ด้วย NestJS CLI
2. ✅ การออกแบบ Entity Schema ด้วย TypeORM decorators
3. ✅ การ inject Repository เพื่อทำงานกับฐานข้อมูล
4. ✅ การใช้ Lifecycle Hooks สำหรับ Data Seeding
5. ✅ การเชื่อมโยง Module และ Entity ให้ทำงานร่วมกัน
6. ✅ การตั้งค่า Global Prefix สำหรับ REST API

**ผลลัพธ์:** ระบบ CRUD พื้นฐานที่สามารถดึงข้อมูลหมวดหมู่หนังสือจากฐานข้อมูลได้สำเร็จ ✨
