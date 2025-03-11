FROM node:18-alpine

# Install necessary system dependencies
RUN apk add --no-cache \
    openssl \
    openssl-dev \
    libc6-compat

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev)
RUN npm ci

# Copy entire project
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Set to development environment
ENV NODE_ENV=development

# Expose port
EXPOSE 3002

# Start the server in development mode
CMD ["npm", "run", "dev"]