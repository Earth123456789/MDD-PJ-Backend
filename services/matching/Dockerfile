# Base image
FROM node:latest AS base

# Create app directory
WORKDIR /app

# Install dependencies
FROM base AS dependencies

# Copy package files
COPY package.json package-lock.json ./

# Install all dependencies (including dev)
RUN npm ci

# Build the application
FROM dependencies AS build

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the NestJS application
RUN npm run build

# Production image
FROM base AS production

# Set environment variables
ENV NODE_ENV=production

# Copy package files
COPY package.json package-lock.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy Prisma schema
COPY prisma ./prisma/

# Generate Prisma client
RUN npx prisma generate

# Copy built application
COPY --from=build /app/dist ./dist

# Expose the application port
EXPOSE 3002

# Ensure NestJS CLI is installed
RUN npm install -g @nestjs/cli

# Command to run the application
CMD ["npm", "run", "start"]
