# Multi-stage build for optimized Cloud Run deployment
# Stage 1: Install production dependencies and generate Prisma client
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Generate Prisma client
RUN npx prisma generate

# Stage 2: Install all dependencies for build
FROM node:20-alpine AS deps
WORKDIR /app

COPY package*.json ./
RUN npm ci && npm cache clean --force

# Stage 3: Build TypeScript
FROM node:20-alpine AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build TypeScript to JavaScript
RUN npm run build

# Stage 4: Production image
FROM node:20-alpine
WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Copy production dependencies and Prisma client from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy built application from build stage
COPY --from=build /app/dist ./dist

# Copy Prisma schema for migrations
COPY --from=build /app/prisma ./prisma

# Copy package.json for metadata
COPY package*.json ./

# Cloud Run sets PORT environment variable
EXPOSE 8080

# Start the application
# Use node directly instead of npm for faster startup
CMD ["node", "dist/index.js"]
