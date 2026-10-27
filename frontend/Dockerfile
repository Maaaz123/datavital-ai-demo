# Stage 1: Build
FROM node:20-alpine AS build

WORKDIR /app

ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ARG VITE_DAGSTER_URL=http://localhost:3001
ENV VITE_DAGSTER_URL=$VITE_DAGSTER_URL
ARG VITE_OPENMETADATA_URL=http://localhost:8585
ENV VITE_OPENMETADATA_URL=$VITE_OPENMETADATA_URL
ARG VITE_OPENMETADATA_UI_INTEGRATION_ENABLED=false
ENV VITE_OPENMETADATA_UI_INTEGRATION_ENABLED=$VITE_OPENMETADATA_UI_INTEGRATION_ENABLED
ARG VITE_AIRBYTE_URL=http://localhost:8001
ENV VITE_AIRBYTE_URL=$VITE_AIRBYTE_URL

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
