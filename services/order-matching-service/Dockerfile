FROM node:18-alpine

# เพิ่มการติดตั้งเครื่องมือที่จำเป็น
RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./

# ติดตั้ง dependencies
RUN npm install

# คัดลอกโค้ดทั้งหมด
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build โปรเจค
RUN npm run build

EXPOSE 3000

# Start service
CMD ["npm", "start"]