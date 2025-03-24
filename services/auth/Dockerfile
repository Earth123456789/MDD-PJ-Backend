# Base image
FROM node:18

# Working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Expose port (เปลี่ยนให้ตรงกับแต่ละ service เช่น 5001 หรือ 3001)
EXPOSE 5001

# Run migration และ start app
CMD sh -c "npx prisma migrate deploy && npm run start"
