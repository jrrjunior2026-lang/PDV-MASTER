# Stage 1: Development base image with all dependencies and source code
FROM node:18-alpine AS development
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Stage 2: Builder stage to create production artifacts
FROM development AS builder
RUN npm run build

# Stage 3: Production final stage
FROM node:18-alpine AS production
RUN apk add --no-cache dumb-init curl
WORKDIR /app
COPY --from=builder /app/package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
RUN chown -R node:node /app
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
