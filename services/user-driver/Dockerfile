FROM node:18-alpine

# Install system dependencies for Alpine
RUN apk add --no-cache \
    openssl \
    build-base \
    python3 \
    make \
    g++ \
    libc6-compat

WORKDIR /app

# Copy package files first for caching
COPY package*.json ./

# Install dependencies using npm ci for a clean install
RUN npm ci

# Copy Prisma files and generate client
COPY prisma ./prisma
RUN npx prisma generate

# Copy the rest of the application source code
COPY . .

# Build the application
RUN npm run build

EXPOSE 3001

# Start the application
CMD ["npm", "start"]
