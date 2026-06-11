import dotenv from 'dotenv';
dotenv.config();

async function cekModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.log("API Key tidak ditemukan di .env!");
        return;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    
    try {
        console.log("Sedang memindai model yang tersedia...\n");
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.error) {
            console.error("Error dari Google:", data.error.message);
            return;
        }

        console.log("=== DAFTAR MODEL YANG BISA KAMU PAKAI ===");
        data.models.forEach(m => {
            // Kita hanya tampilkan model yang mendukung generateContent
            if (m.supportedGenerationMethods.includes("generateContent")) {
                console.log(`- ${m.name.replace('models/', '')}`);
            }
        });
        console.log("=========================================");
        
    } catch (error) {
        console.error("Gagal menghubungi Google API:", error.message);
    }
}

cekModels();