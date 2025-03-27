# Build stage
FROM node:18-alpine as build

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# สร้าง swagger.json
RUN npm run swagger-autogen

RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --only=production

COPY --from=build /app/dist ./dist
COPY --from=build /app/src/swagger.json ./dist/swagger.json
COPY --from=build /app/prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

EXPOSE 3002

CMD ["node", "dist/index.js"]