# Lab Activity 2 - Phase 1: Configuration & User Management

## 🎯 เป้าหมาย

- ย้ายค่า Configuration ไปไฟล์ .env เพื่อความปลอดภัย
- สร้างตาราง User พร้อม Role (ADMIN/USER)
- เก็บ Password แบบ Hash ด้วย Bcrypt
- Seeding Admin User อัตโนมัติ

---

## Step 1.1: Setup Environment Variables

### เป้าหมาย

ย้าย Database Credentials และ JWT Secret ออกจาก Code เพื่อความปลอดภัย

### 1. ติดตั้ง Config Module

**คำสั่ง:**

```bash
npm i --save @nestjs/config
```

**สถานะ:** ✅ ติดตั้งอยู่แล้ว (version ^4.0.2)

---

### 2. สร้างไฟล์ `.env`

**ไฟล์: `.env` (ที่ root directory)**

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=admin
DB_PASSWORD=password123
DB_DATABASE=bookstore_dev
JWT_SECRET=mySuperSecretKey123
```

**⚠️ สำคัญ:**

- ไฟล์ `.env` ต้องอยู่ที่ root directory (ระดับเดียวกับ `package.json`)
- **ห้าม commit ไฟล์ `.env` ขึ้น Git** - เพิ่มใน `.gitignore`:
  ```
  .env
  ```

---

### 3. แก้ไข `app.module.ts`

#### ❌ ก่อนแก้ไข (Hard-coded values)

```typescript
TypeOrmModule.forRoot({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'admin',
  password: 'password123',
  database: 'bookstore_dev',
  entities: [...],
  synchronize: true,
})
```

#### ✅ หลังแก้ไข (ใช้ ConfigService)

**ไฟล์: `src/app.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookCategoryModule } from './book-category/book-category.module';
import { BookCategory } from './book-category/entities/book-category.entity';
import { BookModule } from './book/book.module';
import { Book } from './book/entities/book.entity';
import { UsersModule } from './users/users.module';
import { User } from './users/entities/user.entity';

@Module({
  imports: [
    // 1. Load ConfigModule ก่อน (isGlobal: true ทำให้ใช้ได้ทุก module)
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // 2. ใช้ forRootAsync เพื่อรอให้ ConfigModule โหลดเสร็จก่อน
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        entities: [BookCategory, Book, User],
        synchronize: true,
      }),
      inject: [ConfigService],
    }),

    BookCategoryModule,
    BookModule,
    UsersModule,
  ],
})
export class AppModule {}
```

### การเปลี่ยนแปลงที่สำคัญ:

| ก่อน                 | หลัง                                            | เหตุผล                           |
| -------------------- | ----------------------------------------------- | -------------------------------- |
| `forRoot()`          | `forRootAsync()`                                | รอให้ ConfigModule โหลดเสร็จก่อน |
| Hard-coded values    | `configService.get()`                           | อ่านค่าจาก .env                  |
| ไม่มี `ConfigModule` | `ConfigModule.forRoot()`                        | โหลด .env file                   |
| `entities: [...]`    | ใช้ `autoLoadEntities: true` หรือระบุทุก Entity | ต้องเพิ่ม User entity            |

---

## Step 1.2: Create User Resource

### เป้าหมาย

สร้าง Module สำหรับจัดการผู้ใช้ และกำหนด Role

### 1. Generate Resource

**คำสั่ง:**

```bash
nest g resource users
```

- เลือก: **REST API**
- CRUD entry points: **Yes**

**สถานะ:** ✅ ไฟล์ถูกสร้างแล้ว

---

### 2. นิยาม User Entity

**ไฟล์: `src/users/entities/user.entity.ts`**

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string; // เราจะเก็บแบบ Hashed

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### คำอธิบาย Entity:

| Property    | Type     | Decorator                                   | คำอธิบาย                |
| ----------- | -------- | ------------------------------------------- | ----------------------- |
| `id`        | string   | `@PrimaryGeneratedColumn('uuid')`           | Primary Key (UUID)      |
| `email`     | string   | `@Column({ unique: true })`                 | Email (ห้ามซ้ำ)         |
| `password`  | string   | `@Column()`                                 | รหัสผ่าน (เก็บแบบ hash) |
| `role`      | UserRole | `@Column({ type: 'enum', enum: UserRole })` | สิทธิ์ (ADMIN/USER)     |
| `createdAt` | Date     | `@CreateDateColumn()`                       | วันที่สร้าง             |
| `updatedAt` | Date     | `@UpdateDateColumn()`                       | วันที่แก้ไข             |

### 🔐 UserRole Enum

```typescript
export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}
```

**การใช้งาน:**

- `ADMIN` - สิทธิ์ระดับสูง (เพิ่ม/ลบ/แก้ไขได้ทั้งหมด)
- `USER` - สิทธิ์ระดับทั่วไป (เข้าถึงข้อมูลได้แต่ไม่สามารถแก้ไข)

---

## Step 1.3: Hashing Password & Admin Seeding

### เป้าหมาย

- เข้ารหัส Password ด้วย Bcrypt
- สร้าง Admin User อัตโนมัติเมื่อรัน Server ครั้งแรก

### 1. ติดตั้ง Bcrypt

**คำสั่ง:**

```bash
npm i bcrypt
npm i -D @types/bcrypt
```

**สถานะ:** ✅ ติดตั้งอยู่แล้ว

- `bcrypt`: ^6.0.0
- `@types/bcrypt`: ^6.0.0

---

### 2. สร้าง CreateUserDto

**ไฟล์: `src/users/dto/create-user.dto.ts`**

```typescript
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;
}
```

### Validation Rules:

| Field      | Decorators                           | กฎการตรวจสอบ                         |
| ---------- | ------------------------------------ | ------------------------------------ |
| `email`    | `@IsEmail()`, `@IsNotEmpty()`        | ต้องเป็น email format                |
| `password` | `@IsString()`, `@MinLength(6)`       | ต้องยาวอย่างน้อย 6 ตัวอักษร          |
| `role`     | `@IsEnum(UserRole)`, `@IsOptional()` | ต้องเป็น ADMIN หรือ USER (ไม่บังคับ) |

---

### 3. Implement Users Service

**ไฟล์: `src/users/users.service.ts`**

```typescript
import { Injectable, OnModuleInit, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserRole } from './entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  // 🌱 Auto-seeding Admin User
  async onModuleInit() {
    const admin = await this.findOneByEmail('admin@bookstore.com');
    if (!admin) {
      console.log('Seeding Admin User...');
      await this.create({
        email: 'admin@bookstore.com',
        password: 'adminpassword',
        role: UserRole.ADMIN,
      });
    }
  }

  // 🔐 Create User with Password Hashing
  async create(createUserDto: CreateUserDto) {
    // Hashing Password
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(createUserDto.password, salt);

    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });
    return this.userRepository.save(user);
  }

  async findAll() {
    return this.userRepository.find();
  }

  async findOne(id: string) {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findOneByEmail(email: string) {
    return this.userRepository.findOneBy({ email });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    await this.findOne(id);

    // ถ้ามีการเปลี่ยน password ให้ hash ใหม่
    if (updateUserDto.password) {
      const salt = await bcrypt.genSalt();
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, salt);
    }

    await this.userRepository.update(id, updateUserDto);
    return this.findOne(id);
  }

  async remove(id: string) {
    const user = await this.findOne(id);
    await this.userRepository.delete(id);
    return user;
  }
}
```

### การทำงานของ Password Hashing:

```typescript
// 1. สร้าง Salt (Random string เพื่อความปลอดภัย)
const salt = await bcrypt.genSalt();

// 2. Hash Password โดยใช้ Salt
const hashedPassword = await bcrypt.hash('plainPassword', salt);

// ผลลัพธ์:
// Input:  'adminpassword'
// Output: '$2b$10$XYZ...ABC' (Hash 60 ตัวอักษร)
```

**ทำไมต้อง Hash?**

- ป้องกันการขโมยข้อมูล - แม้ถูก hack ก็อ่าน password ไม่ได้
- ไม่สามารถ reverse กลับเป็น plain text ได้
- แต่ละ user จะมี salt ต่างกัน แม้ password เหมือนกัน

---

### 4. Update Users Module

**ไฟล์: `src/users/users.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService], // ⚠️ IMPORTANT: Export เพื่อให้ Auth Module ใช้
})
export class UsersModule {}
```

**⚠️ สำคัญมาก:**

- `exports: [UsersService]` - จำเป็นสำหรับ Phase 2 (Authentication)
- Auth Module จะต้องเรียกใช้ `UsersService.findOneByEmail()` เพื่อตรวจสอบ Login

---

### 5. Update Users Controller

**ไฟล์: `src/users/users.controller.ts`**

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
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
```

**การเปลี่ยนแปลง:**

- ✅ แก้ไขจาก `+id` (number) เป็น `id` (string UUID)

---

## 📋 สรุปการเปลี่ยนแปลงทั้งหมด

| #   | ไฟล์                  | การเปลี่ยนแปลง                         | สถานะ |
| --- | --------------------- | -------------------------------------- | ----- |
| 1   | `.env`                | สร้างไฟล์เก็บ config variables         | ✅    |
| 2   | `app.module.ts`       | ใช้ ConfigModule + forRootAsync        | ✅    |
| 3   | `app.module.ts`       | เพิ่ม User entity ใน entities array    | ✅    |
| 4   | `user.entity.ts`      | สร้าง Entity พร้อม UserRole enum       | ✅    |
| 5   | `create-user.dto.ts`  | เพิ่ม validation decorators            | ✅    |
| 6   | `users.service.ts`    | Implement password hashing + CRUD      | ✅    |
| 7   | `users.service.ts`    | เพิ่ม onModuleInit สำหรับ seeding      | ✅    |
| 8   | `users.module.ts`     | เพิ่ม TypeOrmModule + exports          | ✅    |
| 9   | `users.controller.ts` | แก้ไข parameter จาก number เป็น string | ✅    |

---

## ✅ Checkpoint: การทดสอบ

### 1. รัน Server

```bash
npm run start:dev
```

### 2. ตรวจสอบ Log

```
[Nest] LOG [NestFactory] Starting Nest application...
[Nest] LOG [InstanceLoader] ConfigModule dependencies initialized
[Nest] LOG [InstanceLoader] TypeOrmModule dependencies initialized
Seeding Admin User...
[Nest] LOG Application is running on: http://[::1]:3000
```

**✅ ต้องเห็น:** `Seeding Admin User...`

---

### 3. ทดสอบ API

#### Test 1: GET ดูรายชื่อ Users

**Request:**

```http
GET http://localhost:3000/api/users
```

**Expected Response: 200 OK**

```json
[
  {
    "id": "uuid-here",
    "email": "admin@bookstore.com",
    "password": "$2b$10$XYZ...ABC",
    "role": "ADMIN",
    "createdAt": "2025-12-18T...",
    "updatedAt": "2025-12-18T..."
  }
]
```

**✅ สังเกต:**

- `password` เป็น hash string (ไม่ใช่ `adminpassword`)
- `role` เป็น `"ADMIN"`

---

#### Test 2: POST สร้าง User ใหม่

**Request:**

```http
POST http://localhost:3000/api/users
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "userpass123"
}
```

**Expected Response: 201 Created**

```json
{
  "id": "new-uuid",
  "email": "user@example.com",
  "password": "$2b$10$...",
  "role": "USER",
  "createdAt": "2025-12-18T...",
  "updatedAt": "2025-12-18T..."
}
```

**✅ สังเกต:**

- `role` เป็น `"USER"` (default)
- `password` ถูก hash แล้ว

---

#### Test 3: POST ด้วย email ซ้ำ (ต้อง error)

**Request:**

```http
POST http://localhost:3000/api/users
Content-Type: application/json

{
  "email": "admin@bookstore.com",
  "password": "test123"
}
```

**Expected Response: 500 Internal Server Error**

```json
{
  "statusCode": 500,
  "message": "duplicate key value violates unique constraint..."
}
```

---

#### Test 4: POST โดยไม่ใส่ password (ต้อง error 400)

**Request:**

```http
POST http://localhost:3000/api/users
Content-Type: application/json

{
  "email": "test@example.com"
}
```

**Expected Response: 400 Bad Request**

```json
{
  "statusCode": 400,
  "message": [
    "password should not be empty",
    "password must be longer than or equal to 6 characters"
  ],
  "error": "Bad Request"
}
```

---

#### Test 5: POST สร้าง Admin User

**Request:**

```http
POST http://localhost:3000/api/users
Content-Type: application/json

{
  "email": "superadmin@example.com",
  "password": "adminpass",
  "role": "ADMIN"
}
```

**Expected Response: 201 Created**

```json
{
  "id": "uuid",
  "email": "superadmin@example.com",
  "password": "$2b$10$...",
  "role": "ADMIN",
  ...
}
```

---

## 🔑 แนวคิดสำคัญที่ได้เรียนรู้

### 1. Environment Variables

```typescript
// ❌ Hard-coded (ไม่ควรทำ)
password: 'password123';

// ✅ ใช้ Environment Variable
password: configService.get<string>('DB_PASSWORD');
```

**ประโยชน์:**

- แยก config จาก code
- เปลี่ยน config ได้โดยไม่ต้อง rebuild
- ปลอดภัย - ไม่ต้อง commit sensitive data

---

### 2. Password Hashing

```typescript
// Plain Text Password (อันตราย!)
password: 'adminpassword';

// Hashed Password (ปลอดภัย)
password: '$2b$10$XYZ...ABC';
```

**Process:**

```
Input (Plain) → bcrypt.genSalt() → Salt
              ↓
Salt + Password → bcrypt.hash() → Hashed Password
```

**การตรวจสอบ Login (Phase 2):**

```typescript
// เปรียบเทียบ plain password กับ hashed password
const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
```

---

### 3. Entity Relationships & Enums

```typescript
export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

@Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
role: UserRole;
```

**ใน Database:**

- PostgreSQL จะสร้าง custom type `user_role_enum`
- เก็บค่าเป็น string: `'ADMIN'` หรือ `'USER'`

---

### 4. Module Exports

```typescript
@Module({
  // ...
  exports: [UsersService], // ทำให้ Module อื่นใช้ได้
})
```

**การใช้งาน:**

```typescript
// ใน Auth Module (Phase 2)
@Module({
  imports: [UsersModule], // Import UsersModule
  // ...
})
export class AuthModule {
  constructor(
    private usersService: UsersService, // ✅ ใช้ได้เพราะ export แล้ว
  ) {}
}
```

---

## 📚 โครงสร้างไฟล์ที่เกี่ยวข้อง

```
wd-nest-book-store/
├── .env                                       # ✅ NEW: Environment variables
├── src/
│   ├── main.ts
│   ├── app.module.ts                          # ✅ UPDATED: ConfigModule + User entity
│   ├── book-category/
│   ├── book/
│   └── users/                                  # ✅ NEW MODULE
│       ├── users.controller.ts                 # ✅ CRUD endpoints
│       ├── users.module.ts                     # ✅ exports: [UsersService]
│       ├── users.service.ts                    # ✅ Password hashing + seeding
│       ├── dto/
│       │   ├── create-user.dto.ts              # ✅ Validation
│       │   └── update-user.dto.ts
│       └── entities/
│           └── user.entity.ts                  # ✅ UserRole enum
```

---

## 🎓 บทสรุป Phase 1

Phase 1 ทำให้เราได้:

1. ✅ ระบบ Configuration ที่ปลอดภัยด้วย Environment Variables
2. ✅ User Entity พร้อม Role-based Access Control (RBAC) structure
3. ✅ Password Hashing ด้วย Bcrypt เพื่อความปลอดภัย
4. ✅ Admin User Seeding อัตโนมัติ
5. ✅ Users API ที่พร้อมใช้งาน (CRUD)

**ผลลัพธ์:**

- มี Admin User: `admin@bookstore.com` / `adminpassword`
- Password ทุกตัวถูก hash ก่อนบันทึก
- พร้อมสำหรับ Phase 2: Authentication & JWT

---

## 🔜 ต่อไปคือ Phase 2: JWT Authentication

ในขั้นต่อไป เราจะ:

- ติดตั้ง `@nestjs/jwt` และ `@nestjs/passport`
- สร้าง Login endpoint ที่ออก JWT Token
- ใช้ `JwtStrategy` ตรวจสอบ Token
- สร้าง `JwtAuthGuard` ป้องกัน endpoints
- ทดสอบ Login และเข้าถึง protected routes

**Credentials สำหรับทดสอบ Phase 2:**

- Email: `admin@bookstore.com`
- Password: `adminpassword`
