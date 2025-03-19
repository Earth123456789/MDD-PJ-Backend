FROM node:18-alpine

WORKDIR /usr/src/app

# ติดตั้ง dependencies ที่จำเป็น
RUN apk --no-cache add curl postgresql-client

# สำเนาไฟล์ package.json และ package-lock.json
COPY package*.json ./

# ติดตั้ง dependencies
RUN npm install

# สำเนาไฟล์โปรเจคทั้งหมด
COPY . .

# สร้าง Prisma client
RUN npx prisma generate

# Build โปรเจค
RUN npm run build

# เปิดพอร์ต
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD curl -f http://localhost:3001/health || exit 1

# รันแอปพลิเคชัน
CMD ["npm", "start"]