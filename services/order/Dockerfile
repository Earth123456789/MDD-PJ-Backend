# Use official Node.js image as a base
FROM node:latest

# Set working directory in the container
WORKDIR /app

# Install dependencies
COPY package*.json ./

# Install necessary tools
RUN apt-get update && apt-get install -y \
  libssl-dev \
  && rm -rf /var/lib/apt/lists/*

# Install npm dependencies
RUN npm install

# Copy all files from the current directory to the container
COPY . .

# Run prisma generate to generate the Prisma client with the right binary target
RUN npx prisma generate

# Expose the application port
EXPOSE 3004

# Run the application
CMD ["npm", "start"]
