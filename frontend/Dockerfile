FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Ссылки на файлы относительные: /files/... (тот же origin, проксирует tracker_web).
# Без этого в бандл попадёт дефолт из кода и загрузка на сервере не заработает.
ENV VITE_STORAGE_URL=""

RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=80
COPY --from=build /app/dist ./dist
COPY server.mjs ./
EXPOSE 80
CMD ["node", "server.mjs"]
