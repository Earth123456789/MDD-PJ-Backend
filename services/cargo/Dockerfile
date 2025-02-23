# Use official Node.js image as a base image
FROM node:16

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package.json ./ 
COPY package-lock.json ./ 

# Install dependencies
RUN npm install

# Copy the TypeScript configuration file
COPY tsconfig.json ./

# Copy the rest of the application code
COPY . .

# Install TypeScript globally (optional, if needed)
RUN npm install -g typescript

# Compile TypeScript to JavaScript (dist folder)
RUN tsc

# Expose the app on port 3001
EXPOSE 3001

# Start the application (run compiled JavaScript from dist folder)
CMD ["node", "dist/app.js"]
