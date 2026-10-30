FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
# npm dentro de Alpine a veces termina con "Exit handler never called".
RUN npm ci --foreground-scripts --no-audit --no-fund
COPY . .
RUN npm test && npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
