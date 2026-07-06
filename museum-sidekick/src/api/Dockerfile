# Museum Sidekick API — multi-stage build for a small runtime image.
FROM node:20-alpine AS build
WORKDIR /app

# Install deps for the api workspace in isolation (no monorepo root needed).
COPY package.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json ./
RUN npm install --omit=dev

COPY --from=build /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/index.js"]
