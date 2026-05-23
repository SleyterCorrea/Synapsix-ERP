# ===========================================
# SYNAPSIX ERP — Dockerfile Frontend
# Node 20 + Vite (dev server)
# ===========================================
FROM node:20-alpine

WORKDIR /app

# Instalar dependencias
COPY package.json ./
RUN npm install

# Copiar código fuente
COPY . .

# Puerto Vite dev server
EXPOSE 5173

# Servidor de desarrollo con hot reload
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
