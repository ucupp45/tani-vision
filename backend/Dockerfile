# Menggunakan base image Alpine yang super ringan
FROM node:20-alpine

# Menentukan direktori kerja di dalam container
WORKDIR /app

# Menyalin file package.json dan menginstal dependencies
COPY package*.json ./
RUN npm install

# Menyalin seluruh source code backend
COPY . .

# Membuka port 5000
EXPOSE 5000

# Perintah untuk menjalankan server
CMD ["node", "server.js"]