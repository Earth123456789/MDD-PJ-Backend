# Base image
FROM node:18-alpine AS base
WORKDIR /app

# --------------------------------------------
# Dependencies Layer (ใช้ cache ได้)
FROM base AS dependencies

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# --------------------------------------------
# Build Layer
FROM dependencies AS build

# Copy all source code AFTER dependencies
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build NestJS app
RUN npm run build

# --------------------------------------------
# Production Image
FROM node:18-alpine AS production

WORKDIR /app
ENV NODE_ENV=production

# Install only production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --legacy-peer-deps

# Copy prisma schema & generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy compiled code from build stage
COPY --from=build /app/dist ./dist

# Expose app port
EXPOSE 3002

# Start the app
CMD ["node", "dist/main"]
