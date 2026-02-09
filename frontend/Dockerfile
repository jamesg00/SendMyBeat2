# Build Stage
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
# Install dependencies
RUN npm ci --silent
COPY . .
# Build the app
RUN npm run build

# Production Stage
FROM node:18-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=build /app/build ./build
EXPOSE 3000
CMD ["serve", "-s", "build", "-l", "3000"]
