FROM node:22-alpine AS web
WORKDIR /app/web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

FROM node:22-alpine AS server
WORKDIR /app/server
RUN apk add --no-cache openssl
COPY server/package*.json ./
RUN npm ci
COPY server/ ./
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine
RUN apk add --no-cache openssl tzdata
ENV NODE_ENV=production TZ=Asia/Tashkent PORT=4000 WEB_DIR=/app/web/dist
WORKDIR /app/server
COPY --from=server /app/server ./
COPY --from=web /app/web/dist /app/web/dist
EXPOSE 4000
CMD ["npm", "start"]
