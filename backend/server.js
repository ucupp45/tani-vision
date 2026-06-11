import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

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
        const imageUrl = `${process.env.R2_ENDPOINT}/${process.env.R2_BUCKET_NAME}/${fileKey}`;

        // 2. Integrasi ke Google Gemini API (Menggunakan model gemini-1.5-flash-latest)
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

        // 3. Kembalikan respons ke Frontend
        res.status(200).json({
            success: true,
            imageUrl: imageUrl,
            analysis: hasilAnalisis
        });

    } catch (error) {
        console.error("Detail Error:", error);
        res.status(500).json({ error: 'Terjadi kesalahan saat memproses gambar atau API Gemini' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Backend siap meluncur di port ${PORT}`);
});