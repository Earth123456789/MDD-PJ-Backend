# Build stage
FROM node:18-alpine AS builder

# Install necessary build dependencies
RUN apk add --no-cache python3 make gcc g++ openssl

WORKDIR /usr/src/app

# Copy package files first
COPY package*.json ./

# Install dependencies with rebuild of native modules
RUN npm install --build-from-source

# Copy entire project
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine

# Install runtime dependencies
RUN apk add --no-cache libstdc++ openssl

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production --build-from-source

# Copy built artifacts from builder stage
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /usr/src/app/prisma ./prisma

# Explicitly rebuild bcrypt
RUN npm rebuild bcrypt

# Expose application port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]