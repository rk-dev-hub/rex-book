# 開発用Dockerイメージ。ソースは docker-compose.yml でボリュームマウントして上書きする前提。
FROM node:22-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 3100

CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0"]
