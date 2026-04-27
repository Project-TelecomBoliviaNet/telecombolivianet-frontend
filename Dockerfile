FROM node:20-alpine AS build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

FROM nginx:alpine AS final
COPY --from=build /app/dist /usr/share/nginx/html

# Colocar en /templates/ para que el entrypoint de nginx:alpine ejecute
# envsubst automáticamente al arrancar, sustituyendo solo BACKEND_INTERNAL_URL.
# Las variables de nginx ($host, $remote_addr, $uri, etc.) NO se tocan.
COPY nginx.conf /etc/nginx/templates/default.conf.template
ENV NGINX_ENVSUBST_TEMPLATE_VARS=BACKEND_INTERNAL_URL
# Valor por defecto para docker-compose local; Railway lo sobreescribe con su variable.
ENV BACKEND_INTERNAL_URL=http://backend:5000

EXPOSE 80
# El entrypoint de nginx:alpine procesa templates y luego lanza nginx.
CMD ["nginx", "-g", "daemon off;"]
