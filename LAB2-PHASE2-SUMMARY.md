# Lab 2 Phase 2: JWT Authentication - สรุปการทำงาน

## ภาพรวม Phase 2

Phase นี้เราจะทำการ implement JWT (JSON Web Token) authentication system เพื่อให้ user สามารถ login และรับ access token สำหรับการยืนยันตัวตนในการเข้าถึง protected endpoints

---

## ✅ สิ่งที่เราได้ทำใน Phase 2

### 1. ติดตั้ง Dependencies ที่จำเป็น

```bash
pnpm install @nestjs/jwt @nestjs/passport passport passport-jwt
pnpm install -D @types/passport-jwt
```

**Packages ที่ติดตั้ง:**

- `@nestjs/jwt` v11.0.2 - JWT module สำหรับ NestJS
- `@nestjs/passport` v11.0.5 - Passport integration กับ NestJS
- `passport-jwt` v4.0.1 - JWT strategy สำหรับ Passport
- `@types/passport-jwt` - TypeScript types

**ตรวจสอบใน package.json:**

```json
{
  "dependencies": {
    "@nestjs/jwt": "^11.0.2",
    "@nestjs/passport": "^11.0.5",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1",
    "bcrypt": "^6.0.0"
  },
  "devDependencies": {
    "@types/passport-jwt": "^4.0.1"
  }
}
```

---

### 2. สร้างไฟล์ LoginDto

**สร้างไฟล์:** `src/auth/dto/login.dto.ts`

```typescript
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}
```

**จุดสำคัญ:**

- ใช้ `@IsEmail()` เพื่อ validate format ของ email
- ใช้ `@IsNotEmpty()` เพื่อตรวจสอบว่าต้องไม่เป็นค่าว่าง
- มี custom error messages ที่อ่านง่าย

---

### 3. สร้าง JWT Strategy

**สร้างไฟล์:** `src/auth/jwt.strategy.ts`

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    return {
      userId: payload.sub,
      email: payload.username,
      role: payload.role,
    };
  }
}
```

**การทำงานของ JWT Strategy:**

1. **ExtractJwt.fromAuthHeaderAsBearerToken()** - ดึง JWT token จาก Authorization header
   - Header format: `Authorization: Bearer <token>`
2. **secretOrKey** - ใช้ secret key จาก .env file (JWT_SECRET) เพื่อ verify token
3. **ignoreExpiration: false** - ตรวจสอบว่า token หมดอายุหรือยัง
4. **validate()** method - ถูกเรียกเมื่อ token valid แล้ว
   - แปลง payload เป็น user object ที่จะถูกเก็บใน `request.user`
   - `sub` → `userId` (standard JWT claim)
   - `username` → `email` (ข้อมูล user)
   - `role` → `role` (ADMIN/USER)

---

### 4. อัพเดท Auth Module

**แก้ไขไฟล์:** `src/auth/auth.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
```

**จุดสำคัญ:**

1. **PassportModule** - เปิดใช้งาน Passport authentication
2. **JwtModule.registerAsync()** - ใช้ async configuration เพื่อรอ ConfigService
   - `secret`: ดึง JWT_SECRET จาก environment variables
   - `signOptions: { expiresIn: '1d' }`: token หมดอายุใน 1 วัน
3. **Providers**:
   - `AuthService` - ตรรกะสำหรับ authentication
   - `JwtStrategy` - Passport strategy สำหรับ JWT
4. **Exports**: `AuthService` - เพื่อให้ module อื่นใช้งานได้

---

### 5. อัพเดท Auth Service

**แก้ไขไฟล์:** `src/auth/auth.service.ts`

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findOneByEmail(email);

    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(pass, user.password);

    if (isPasswordValid) {
      const { password, ...result } = user;
      return result;
    }

    return null;
  }

  async login(user: any) {
    const payload = {
      username: user.email,
      sub: user.id,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
```

**การทำงานของ methods:**

#### validateUser(email, pass)

1. ค้นหา user จาก email ที่ระบุ
2. ถ้าไม่เจอ user → return `null`
3. ถ้าเจอ user → ใช้ bcrypt.compare() เปรียบเทียบ password
4. ถ้า password ถูกต้อง → ส่งคืน user object โดยไม่มี password field
5. ถ้า password ผิด → return `null`

#### login(user)

1. สร้าง JWT payload object:
   - `username`: email ของ user
   - `sub`: user ID (standard JWT claim)
   - `role`: ADMIN หรือ USER
2. ใช้ `jwtService.sign()` สร้าง JWT token
3. ส่งคืน object ที่มี `access_token`

**Security Features:**

- ใช้ bcrypt.compare() ที่ปลอดภัย (ไม่ใช่ ==)
- ไม่ส่ง password field กลับไปใน response
- Token มี expiration time (1 วัน)

---

### 6. อัพเดท Auth Controller

**แก้ไขไฟล์:** `src/auth/auth.controller.ts`

```typescript
import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.authService.login(user);
  }
}
```

**การทำงานของ login endpoint:**

1. รับ email และ password จาก request body (LoginDto)
2. เรียก `validateUser()` เพื่อตรวจสอบข้อมูล
3. ถ้า credentials ไม่ถูกต้อง → throw `UnauthorizedException` (401)
4. ถ้าถูกต้อง → เรียก `login()` เพื่อสร้าง JWT token
5. ส่งคืน `{ access_token: "..." }`

**HTTP Endpoint:**

- **Method:** POST
- **Path:** `/api/auth/login`
- **Body:**
  ```json
  {
    "email": "admin@bookstore.com",
    "password": "adminpassword"
  }
  ```

---

### 7. ตรวจสอบ Environment Variables

**ไฟล์:** `.env`

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=admin
DB_PASSWORD=password123
DB_DATABASE=bookstore_dev

JWT_SECRET=mySuperSecretKey123
```

**สิ่งสำคัญ:**

- `JWT_SECRET` ต้องเป็น strong secret key
- ใน production ควรใช้ secret ที่ยาวและซับซ้อนกว่านี้
- ไฟล์ `.env` ต้องอยู่ใน `.gitignore` (ห้าม commit!)

---

### 8. อัพเดท App Module

**ตรวจสอบ:** `src/app.module.ts`

```typescript
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({...}),
    BookCategoryModule,
    BookModule,
    UsersModule,
    AuthModule,  // ✅ เพิ่ม AuthModule
  ],
})
export class AppModule {}
```

**ตรวจสอบว่า:**

- ✅ AuthModule ถูก import แล้ว
- ✅ ConfigModule.forRoot กำหนด isGlobal: true แล้ว
- ✅ UsersModule อยู่ก่อน AuthModule (เพราะ AuthModule ต้องใช้ UsersService)

---

## 🧪 วิธีทดสอบ Authentication

### 1. เริ่ม Server

```bash
pnpm start:dev
```

**ตรวจสอบ Console:**

- Server ควรเริ่มที่ `http://localhost:3000`
- ไม่มี error เกี่ยวกับ JWT หรือ Passport
- Admin user ถูกสร้างอัตโนมัติ (จาก Phase 1 seeding)

---

### 2. ทดสอบ Login (Success)

**Request:**

```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "admin@bookstore.com",
  "password": "adminpassword"
}
```

**Expected Response:**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**ตรวจสอบ:**

- ✅ Status Code: 200 OK
- ✅ Response มี `access_token` field
- ✅ Token เป็น string ยาว (JWT format)

**Verify Token:**
ไปที่ [jwt.io](https://jwt.io) และ paste token เพื่อดู payload:

```json
{
  "username": "admin@bookstore.com",
  "sub": "uuid-ของ-admin",
  "role": "ADMIN",
  "iat": 1234567890,
  "exp": 1234654290
}
```

---

### 3. ทดสอบ Login (Invalid Email)

**Request:**

```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "wrong@example.com",
  "password": "adminpassword"
}
```

**Expected Response:**

```json
{
  "message": "Invalid credentials",
  "error": "Unauthorized",
  "statusCode": 401
}
```

**ตรวจสอบ:**

- ✅ Status Code: 401 Unauthorized
- ✅ Message: "Invalid credentials"

---

### 4. ทดสอบ Login (Invalid Password)

**Request:**

```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "admin@bookstore.com",
  "password": "wrongpassword"
}
```

**Expected Response:**

```json
{
  "message": "Invalid credentials",
  "error": "Unauthorized",
  "statusCode": 401
}
```

**ตรวจสอบ:**

- ✅ Status Code: 401 Unauthorized
- ✅ Password ผิดถูก detect
- ✅ Security: ไม่บอกว่า email ถูกหรือ password ผิด (ป้องกัน username enumeration)

---

### 5. ทดสอบ Validation (Invalid Email Format)

**Request:**

```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "notanemail",
  "password": "adminpassword"
}
```

**Expected Response:**

```json
{
  "message": ["Please provide a valid email address"],
  "error": "Bad Request",
  "statusCode": 400
}
```

**ตรวจสอบ:**

- ✅ Status Code: 400 Bad Request
- ✅ Validation error message แสดงถูกต้อง

---

### 6. ทดสอบ Validation (Missing Fields)

**Request:**

```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": ""
}
```

**Expected Response:**

```json
{
  "message": [
    "Email is required",
    "Please provide a valid email address",
    "Password is required"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

**ตรวจสอบ:**

- ✅ Status Code: 400 Bad Request
- ✅ แสดง validation errors ทั้งหมด

---

## 📊 JWT Authentication Flow

```
Client                Controller              Service              Database
  |                       |                       |                       |
  |-- POST /auth/login -->|                       |                       |
  |   (email, password)   |                       |                       |
  |                       |                       |                       |
  |                       |-- validateUser() ---->|                       |
  |                       |                       |                       |
  |                       |                       |-- findOneByEmail() -->|
  |                       |                       |<---- user ------------|
  |                       |                       |                       |
  |                       |                       |-- bcrypt.compare() ---|
  |                       |                       |    (password check)   |
  |                       |<--- user (no pwd) ----|                       |
  |                       |                       |                       |
  |                       |-- login(user) ------->|                       |
  |                       |                       |                       |
  |                       |                       |-- jwtService.sign() --|
  |                       |                       |    (create token)     |
  |                       |<--- access_token -----|                       |
  |                       |                       |                       |
  |<-- 200 OK ------------|                       |                       |
  |   { access_token }    |                       |                       |
```

---

## 🔒 Security Features

### 1. Password Hashing (จาก Phase 1)

- ใช้ bcrypt กับ salt rounds
- Password ไม่ถูกเก็บเป็น plain text
- ใช้ bcrypt.compare() สำหรับ verification (timing-attack resistant)

### 2. JWT Token Security

- Token มี expiration time (1 วัน)
- Secret key เก็บใน environment variables
- Token ถูก sign ด้วย HS256 algorithm

### 3. Error Handling

- ไม่เปิดเผยข้อมูลว่า email มีอยู่ในระบบหรือไม่
- Error messages generic: "Invalid credentials"
- ป้องกัน username enumeration attacks

### 4. Validation

- Input validation ด้วย class-validator
- Email format validation
- Required field validation

---

## 📁 โครงสร้างไฟล์ที่เพิ่มใหม่

```
src/
├── auth/
│   ├── dto/
│   │   └── login.dto.ts              # DTO สำหรับ login
│   ├── auth.controller.ts            # Login endpoint
│   ├── auth.service.ts               # Authentication logic
│   ├── auth.module.ts                # Auth module config
│   └── jwt.strategy.ts               # JWT Passport strategy
├── users/
│   ├── users.service.ts              # (มีอยู่แล้ว) findOneByEmail()
│   └── entities/user.entity.ts       # (มีอยู่แล้ว) User entity
└── app.module.ts                      # (อัพเดท) import AuthModule
```

---

## 🎯 สิ่งที่ได้เรียนรู้

### 1. JWT (JSON Web Tokens)

- Token-based authentication
- Stateless authentication (ไม่ต้องเก็บ session)
- Payload structure: header + payload + signature
- Token expiration และการ verify signature

### 2. Passport.js

- Authentication middleware สำหรับ Node.js
- Strategy pattern (JWT Strategy, Local Strategy, etc.)
- Integration กับ NestJS ผ่าน @nestjs/passport

### 3. NestJS Guards (Preview สำหรับ Phase 3)

- JWT Strategy จะถูกใช้สร้าง JwtAuthGuard
- Guards ป้องกัน unauthorized access
- Request pipeline: Guard → Controller → Service

### 4. Best Practices

- แยก authentication logic ออกมาเป็น module
- ใช้ DTO สำหรับ validation
- เก็บ secrets ใน environment variables
- Async configuration สำหรับ dynamic values

---

## ✅ Checklist สำหรับ Phase 2

- [x] ติดตั้ง JWT และ Passport packages
- [x] สร้าง LoginDto พร้อม validation
- [x] สร้าง JwtStrategy สำหรับ Passport
- [x] อัพเดท AuthModule ให้ใช้ JwtModule.registerAsync()
- [x] เพิ่ม validateUser() method ใน AuthService
- [x] เพิ่ม login() method ใน AuthService
- [x] สร้าง POST /auth/login endpoint
- [x] ตรวจสอบ JWT_SECRET ใน .env
- [x] Import AuthModule ใน AppModule
- [x] ทดสอบ login endpoint (success case)
- [x] ทดสอบ login endpoint (invalid credentials)
- [x] ทดสอบ validation errors
- [x] ตรวจสอบ token payload ที่ jwt.io

---

## 🚀 ขั้นตอนถัดไป (Phase 3: Authorization)

Phase ถัดไปเราจะ implement:

1. **JwtAuthGuard** - Guard สำหรับป้องกัน protected endpoints
2. **RolesGuard** - Guard สำหรับตรวจสอบ user roles (ADMIN/USER)
3. **Public Decorator** - ทำให้บาง endpoint เป็น public (ไม่ต้อง auth)
4. **Protected Endpoints** - ใช้ Guards กับ endpoints ที่ต้องการ authentication

**Preview:**

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Delete(':id')
async remove(@Param('id') id: string) {
  // เฉพาะ ADMIN เท่านั้นที่ลบได้
}
```

---

## 📝 บันทึกสำคัญ

### Credentials สำหรับการทดสอบ

```
Email: admin@bookstore.com
Password: adminpassword
Role: ADMIN
```

### JWT Token Format

```
Authorization: Bearer <token>
```

### Token Expiration

- ปัจจุบัน: 1 วัน (1d)
- สามารถแก้ไขได้ที่ auth.module.ts → signOptions.expiresIn

### Common Issues & Solutions

**Problem:** "Cannot find module @nestjs/jwt"
**Solution:**

```bash
pnpm install @nestjs/jwt @nestjs/passport passport passport-jwt
```

**Problem:** "JWT_SECRET is undefined"
**Solution:**

- ตรวจสอบไฟล์ .env มี JWT_SECRET=...
- ConfigModule.forRoot มี isGlobal: true

**Problem:** "401 Unauthorized" แม้ credentials ถูกต้อง
**Solution:**

- ตรวจสอบ bcrypt.compare() ใน validateUser()
- ตรวจสอบว่า password ใน database ถูก hash แล้ว

---

## 🎉 สรุป Phase 2

เราได้ implement JWT Authentication ที่สมบูรณ์แล้ว โดย:

1. ✅ ติดตั้ง dependencies ที่จำเป็น
2. ✅ สร้าง LoginDto สำหรับ validation
3. ✅ สร้าง JWT Strategy สำหรับ Passport
4. ✅ Configure JwtModule ด้วย async configuration
5. ✅ Implement validateUser() และ login() methods
6. ✅ สร้าง POST /auth/login endpoint
7. ✅ ทดสอบทุก cases (success, failure, validation)

**ผลลัพธ์:**

- User สามารถ login ได้ด้วย email/password
- System ส่งคืน JWT access token
- Token มี user information (email, id, role) ใน payload
- Token หมดอายุใน 1 วัน
- Validation ทำงานถูกต้อง
- Error handling ปลอดภัย

**Next:** Phase 3 - Authorization (Guards และ Role-based Access Control)

---

**เอกสารสร้างวันที่:** `date +'%Y-%m-%d %H:%M:%S'`  
**Version:** Lab 2 Phase 2  
**Status:** ✅ Complete
