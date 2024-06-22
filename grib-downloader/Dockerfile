# Build stage
FROM node:21.7.2 AS builder

# Set working directory
WORKDIR /app

# Copy shared module and install its dependencies
COPY shared /app/shared
WORKDIR /app/shared/module
RUN npm install

# Copy service files and install its dependencies
WORKDIR /app/service
COPY grib-downloader .
RUN npm install

# Final stage
FROM node:21.7.2-slim

# Set working directory
WORKDIR /app

# Copy built files from builder stage
COPY --from=builder /app .

# Set command to run the service
CMD ["node", "service/index.js"]