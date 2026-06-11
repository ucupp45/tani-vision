FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Membuka port default Vite
EXPOSE 5173

# Menjalankan Vite agar bisa diakses dari luar container (--host)
CMD ["npm", "run", "dev", "--", "--host"]