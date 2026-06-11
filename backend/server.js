import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import mysql from 'mysql2/promise'; // Tambahan untuk koneksi MySQL
import promBundle from 'express-prom-bundle';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Konfigurasi Multer untuk menyimpan file sementara di memori (RAM)
const upload = multer({ storage: multer.memoryStorage() });

// Inisialisasi Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Inisialisasi S3 Client untuk Cloudflare R2
const s3 = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

// --- Konfigurasi Koneksi ke AWS RDS ---
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Fungsi Otomatis Pembuat Database & Tabel
async function initDB() {
    try {
        const connection = await pool.getConnection();
        await connection.query('CREATE DATABASE IF NOT EXISTS tanivision;');
        await connection.query('USE tanivision;');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS riwayat_diagnosis (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nama_file VARCHAR(255),
                hasil_analisis TEXT,
                tanggal TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        connection.release();
        console.log("✅ Database RDS & Tabel riwayat_diagnosis siap mengamankan data!");
    } catch (err) {
        console.error("❌ Gagal inisialisasi database RDS:", err);
    }
}
initDB();
// --------------------------------------

// Fungsi pembantu untuk mengubah buffer gambar ke format inlineData Gemini
function fileToGenerativePart(buffer, mimeType) {
    return {
        inlineData: {
            data: buffer.toString("base64"),
            mimeType
        },
    };
}

app.post('/api/diagnosa', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Gambar tidak ditemukan' });
        }

        console.log(`Menerima gambar: ${req.file.originalname}`);

        // 1. Unggah Gambar ke Cloudflare R2 (Syarat Multi-Cloud Storage)
        const fileKey = `${Date.now()}-${req.file.originalname.replace(/\s+/g, '-')}`;
        const uploadParams = {
            Bucket: process.env.R2_BUCKET_NAME,
            Key: fileKey,
            Body: req.file.buffer,
            ContentType: req.file.mimetype,
        };

        console.log('Mengunggah ke Cloudflare R2...');
        await s3.send(new PutObjectCommand(uploadParams));
        
        // Asumsi URL publik R2
        const imageUrl = `https://pub-52948cacb0754fac892c00397fa4dfb7.r2.dev/${fileKey}`;

        // 2. Integrasi ke Google Gemini API 
        console.log('Menganalisis dengan Gemini API...');
        const model = genAI.getGenerativeModel({ model: "gemini-flash-lite-latest" });
        
        // Siapkan gambar untuk Gemini
        const imagePart = fileToGenerativePart(req.file.buffer, req.file.mimetype);
        
        // Prompt instruksi ke AI
        const prompt = `
            Bertindaklah sebagai pakar agronomi dan penyakit tanaman. 
            Analisis gambar tanaman yang diunggah ini. Berikan laporan ringkas dengan format:
            1. Jenis Tanaman: (Sebutkan nama tanamannya)
            2. Diagnosis Penyakit/Hama: (Nama penyakit atau jika sehat, katakan sehat)
            3. Gejala: (Sebutkan gejala yang terlihat pada gambar)
            4. Langkah Penanganan: (Berikan solusi konkret atau cara mengatasi)
        `;

        // Eksekusi pemanggilan AI
        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const hasilAnalisis = response.text();

        console.log('Analisis selesai!');

        // --- 3. Simpan Riwayat ke AWS RDS ---
        try {
            await pool.query(
                'INSERT INTO tanivision.riwayat_diagnosis (nama_file, hasil_analisis) VALUES (?, ?)',
                [req.file.originalname, hasilAnalisis] 
            );
            console.log("💾 Riwayat diagnosis berhasil direkam di AWS RDS!");
        } catch (dbError) {
            console.error("❌ Gagal merekam ke RDS:", dbError);
        }
        // ------------------------------------

        // 4. Kembalikan respons ke Frontend
        res.status(200).json({
            success: true,
            imageUrl: imageUrl,
            analysis: hasilAnalisis
        });

    } catch (error) {
        console.error("Detail Error:", error);
        res.status(500).json({ error: 'Terjadi kesalahan saat memproses gambar atau API Gemini' });
    }

        // Sensor Prometheus
        const metricsMiddleware = promBundle({
            includeMethod: true, 
            includePath: true, 
            promClient: { collectDefaultMetrics: {} }
        });
        app.use(metricsMiddleware);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Backend siap meluncur di port ${PORT}`);
});