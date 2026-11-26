# Use official lightweight Node.js LTS image 
FROM node:18-alpine 

# Set working directory inside container
WORKDIR /app 

# Copy package manifests first for optimal layer caching 
COPY package*.json ./ 

# Install only production dependencies 
RUN npm ci --only=production 

# Copy remaining server application code 
COPY . . 

# Expose backend application port 
EXPOSE 5000 

# Set production environment 
ENV NODE_ENV=production 

# Startup command 
CMD ["node", "server.js"]