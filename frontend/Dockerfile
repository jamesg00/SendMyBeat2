# Build Stage
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
# Install dependencies
RUN npm ci --silent
COPY . .
# Build the app
ENV GENERATE_SOURCEMAP=false
ENV NODE_OPTIONS="--max-old-space-size=2048"
RUN npm run build

# Production Stage
FROM node:18-alpine
WORKDIR /app
RUN npm install -g serve@14
COPY --from=build /app/build ./build
EXPOSE 3000
# No -s: it sends every path to index.html and skips the prerendered pages. build/serve.json
# (written by scripts/prerender-seo.js) maps each public page to its own file, the rest to app.html.
CMD ["serve", "build", "-l", "3000"]
