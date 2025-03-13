## โครงสร้างโปรเจค

```
driver-api/
├── src/                      # โค้ดหลักของแอปพลิเคชัน
│   ├── controllers/          # จัดการ HTTP requests และ responses
│   ├── middlewares/          # Express middlewares (auth, validation, etc.)
│   ├── models/               # โมเดลข้อมูล
│   ├── routes/               # กำหนด API routes
│   ├── services/             # Business logic
│   ├── utils/                # Utility functions
│   ├── types/                # TypeScript type definitions
│   ├── prisma/               # Prisma schema และ migrations
│   ├── app.ts                # Express app setup
│   └── server.ts             # Entry point
├── tests/                    # Unit และ integration tests
├── prisma/                   # Prisma configuration
│   ├── schema.prisma         # Database schema
│   └── migrations/           # Database migrations
├── .env                      # Environment variables
├── .env.example              # ตัวอย่าง environment variables
├── docker-compose.yml        # Docker configuration
├── Dockerfile                # Docker image configuration
├── tsconfig.json             # TypeScript configuration
└── package.json              # Dependencies และ scripts
```

### ขั้นตอนการติดตั้ง

1. Clone repository:

```bash
git clone https://github.com/your-organization/MDD-PJ-Backend.git
cd MDD-PJ-Backend/services/driver
```

2. ติดตั้ง dependencies:

```bash
npm install
```

3. สร้างไฟล์ `.env` โดยคัดลอกจาก `.env.example`:

```bash
cp .env.example .env
```

4. แก้ไขไฟล์ `.env` เพื่อกำหนดค่าการเชื่อมต่อฐานข้อมูลและค่าอื่นๆ:

```
# Database - Neon PostgreSQL
DATABASE_URL=postgresql://neondb_owner:npg_7iqVXltYPyM9@ep-long-pond-a1u0zd0v-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require

# JWT
JWT_SECRET=your_jwt_secret_change_this
```

5. สร้าง Prisma client และ migrate ฐานข้อมูล:

```bash
# สร้าง Prisma client
npx prisma generate

# สร้าง database schema
npx prisma migrate dev --name init
```

## การรัน

### Development mode

```bash
npm run start:dev
```

### Production mode

```bash
npm run build
npm start
```

### ใช้ Docker

```bash
docker-compose up -d
```

## การใช้งาน API

### Authentication

API routes ส่วนใหญ่ต้องการ JWT authentication ยกเว้น routes สำหรับลงทะเบียนและเข้าสู่ระบบ

1. **ลงทะเบียน Driver ใหม่**:

```http
POST /api/v1/drivers/register
Content-Type: application/json

{
  "firstName": "สมชาย",
  "lastName": "ใจดี",
  "phoneNumber": "0891234567",
  "email": "somchai@example.com",
  "licenseNumber": "1234567890",
  "licenseExpiry": "2025-12-31T00:00:00.000Z",
  "idCardNumber": "1100400123456",
  "dateOfBirth": "1990-01-01T00:00:00.000Z",
  "address": "123 ถนนสุขุมวิท กรุงเทพฯ",
  "password": "password123"
}
```

2. **เข้าสู่ระบบเพื่อรับ JWT token**:

```http
POST /api/v1/drivers/login
Content-Type: application/json

{
  "phoneNumber": "0891234567",
  "password": "password123"
}
```

Response จะมี token ที่ต้องใช้สำหรับ requests อื่นๆ:

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "driver": {
      "id": "abc123...",
      "firstName": "สมชาย",
      ...
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

3. **ใช้ JWT token ในการเรียก API อื่นๆ**:

เพิ่ม header `Authorization: Bearer <token>` ในทุก request ที่ต้องการ authentication

### Endpoints

#### Driver Management

- `GET /api/v1/drivers` - ดึงรายการ drivers ทั้งหมด (มี filter และ pagination)
- `GET /api/v1/drivers/:id` - ดึงข้อมูล driver ตาม ID
- `PUT /api/v1/drivers/:id` - อัปเดตข้อมูล driver
- `DELETE /api/v1/drivers/:id` - ลบข้อมูล driver

#### Driver Status Management

- `PATCH /api/v1/drivers/:id/status` - อัปเดตสถานะของ driver (ACTIVE, INACTIVE, SUSPENDED, BLOCKED)
- `PATCH /api/v1/drivers/:id/availability` - อัปเดตสถานะความพร้อมให้บริการ (true/false)

#### Location Management

- `PATCH /api/v1/drivers/:id/location` - อัปเดตตำแหน่งปัจจุบันของ driver
- `GET /api/v1/drivers/nearby/:latitude/:longitude/:radius` - ค้นหา drivers ในบริเวณใกล้เคียง

## ตัวอย่างการใช้งาน API

### 1. ลงทะเบียน Driver ใหม่

```bash
curl -X POST http://localhost:3000/api/v1/drivers/register \
-H "Content-Type: application/json" \
-d '{
  "firstName": "สมชาย",
  "lastName": "ใจดี",
  "phoneNumber": "0891234567",
  "email": "somchai@example.com",
  "licenseNumber": "1234567890",
  "licenseExpiry": "2025-12-31T00:00:00.000Z",
  "idCardNumber": "1100400123456",
  "dateOfBirth": "1990-01-01T00:00:00.000Z",
  "address": "123 ถนนสุขุมวิท กรุงเทพฯ",
  "password": "password123"
}'
```

### 2. เข้าสู่ระบบ

```bash
curl -X POST http://localhost:3000/api/v1/drivers/login \
-H "Content-Type: application/json" \
-d '{
  "phoneNumber": "0891234567",
  "password": "password123"
}'
```

### 3. ดึงข้อมูล Driver ทั้งหมด (ต้องใช้ token)

```bash
curl -X GET http://localhost:3000/api/v1/drivers \
-H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 4. อัปเดตตำแหน่ง Driver

```bash
curl -X PATCH http://localhost:3000/api/v1/drivers/YOUR_DRIVER_ID/location \
-H "Authorization: Bearer YOUR_TOKEN_HERE" \
-H "Content-Type: application/json" \
-d '{
  "latitude": 13.7563,
  "longitude": 100.5018,
  "currentLocation": "สยามพารากอน, กรุงเทพฯ"
}'
```

### 5. อัปเดตสถานะความพร้อมให้บริการ

```bash
curl -X PATCH http://localhost:3000/api/v1/drivers/YOUR_DRIVER_ID/availability \
-H "Authorization: Bearer YOUR_TOKEN_HERE" \
-H "Content-Type: application/json" \
-d '{
  "isAvailable": true
}'
```

### 6. ค้นหา Driver ในบริเวณใกล้เคียง

```bash
curl -X GET http://localhost:3000/api/v1/drivers/nearby/13.7563/100.5018/5 \
-H "Authorization: Bearer YOUR_TOKEN_HERE"
```
