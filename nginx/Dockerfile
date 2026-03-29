# Build stage for frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Copy frontend package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci

# Copy frontend source code
COPY frontend/ ./

# Build argument for API URL
ARG VITE_API_URL

# Set environment variable for build
ENV VITE_API_URL=$VITE_API_URL

# Build the frontend
RUN npm run build

# Production stage with nginx
FROM nginx:alpine AS production

# Copy nginx configuration
COPY nginx/nginx.conf /etc/nginx/nginx.conf

# Create SSL directory
RUN mkdir -p /etc/nginx/ssl

# Copy built frontend from builder stage
COPY --from=frontend-builder /app/dist /usr/share/nginx/html

# Expose ports
EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]