import { useState } from 'react'

function App() {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
      setResult('');
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!image) {
      setError('Pilih gambar terlebih dahulu bro!');
      return;
    }

    setLoading(true);
    setError('');
    setResult('');

    const formData = new FormData();
    formData.append('image', image);

    try {
      // Mengirim request ke backend lokal kita
      const response = await fetch('http://3.27.212.182:5000/api/diagnosa', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal memproses gambar');
      }

      setResult(data.analysis);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-6 font-sans">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-green-700 mb-2 text-center">TaniVision</h1>
        <p className="text-gray-500 text-center mb-8">Platform Cerdas Diagnosis Penyakit Tanaman</p>

        {/* Area Upload */}
        <div className="flex flex-col items-center gap-4 mb-6">
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleImageChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 cursor-pointer"
          />
          
          {preview && (
            <img src={preview} alt="Preview" className="max-h-64 rounded-lg object-cover shadow-sm border border-gray-200" />
          )}

          <button 
            onClick={handleUpload}
            disabled={loading || !image}
            className={`w-full py-3 rounded-lg font-bold text-white transition-all ${
              loading || !image ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 shadow-md'
            }`}
          >
            {loading ? 'Menganalisis dengan AI...' : 'Analisis Tanaman'}
          </button>
        </div>

        {/* Area Hasil & Error */}
        {error && (
          <div className="p-4 bg-red-100 text-red-700 rounded-lg mb-4 text-center">
            {error}
          </div>
        )}

        {result && (
          <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
            <h2 className="text-xl font-bold text-green-800 mb-4">Hasil Diagnosis:</h2>
            <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
              {result}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App