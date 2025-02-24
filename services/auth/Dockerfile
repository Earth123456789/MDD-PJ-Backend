# Use an official Node.js runtime as the base image
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json to install dependencies first
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the project files
COPY . .

# Compile TypeScript to JavaScript
RUN npm run build

# Expose the application port
EXPOSE 3001

# Start the application
CMD ["node", "dist/app.js"]
