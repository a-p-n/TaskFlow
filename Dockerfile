# Stage 1: Build dependencies
FROM node:18-alpine AS dependencies

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev

# Stage 2: Create the final, smaller production image
FROM node:18-alpine

WORKDIR /app

# Copy dependencies from the previous stage
COPY --from=dependencies /app/node_modules ./node_modules
COPY package*.json ./
COPY api ./api
COPY public ./public

# Expose the port the app runs on
EXPOSE 3000

# Command to start the server
CMD ["node", "api/index.js"]