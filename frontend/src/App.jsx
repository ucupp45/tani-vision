import { useState } from 'react'

function App() {
  // State Navigasi & Auth
  const [activeTab, setActiveTab] = useState('utama'); // 'utama' atau 'admin'
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginInput, setLoginInput] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  // State Diagnosis Utama
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  // State Riwayat (Untuk Dashboard Admin)
  const [history, setHistory] = useState([]);

  // --- FUNGSI LOGIN ADMIN ---
  const handleLogin = (e) => {
    e.preventDefault();
    if (loginInput.username === 'admin' && loginInput.password === '12345') {
      setIsLoggedIn(true);
      setLoginError('');
    } else {
      setLoginError('Username atau Password salah!');
    }
  };

  // --- FUNGSI UPLOAD ---
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
      // Mengirim request ke backend EC2 AWS kita
      const response = await fetch('http://3.27.212.182:5000/api/diagnosa', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal memproses gambar');
      }

      setResult(data.analysis);

      // Simpan riwayat ke state untuk ditampilkan di Admin
      setHistory(prevHistory => [
        {
          id: Date.now(),
          filename: image.name,
          imageUrl: data.imageUrl, // Ini URL R2 Cloudflare-nya!
          analysis: data.analysis,
          date: new Date().toLocaleString('id-ID')
        },
        ...prevHistory
      ]);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      
      {/* NAVBAR / TASKBAR */}
      <nav className="bg-green-700 text-white shadow-md">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex justify-between items-center py-4">
            <div className="font-bold text-xl tracking-wider flex items-center gap-2">
              <span>🌱</span> TaniVision
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => setActiveTab('utama')}
                className={`px-4 py-2 rounded-md font-semibold transition-all ${activeTab === 'utama' ? 'bg-green-900 shadow-inner' : 'hover:bg-green-600'}`}
              >
                Dashboard Utamaaa
              </button>
              <button 
                onClick={() => setActiveTab('admin')}
                className={`px-4 py-2 rounded-md font-semibold transition-all ${activeTab === 'admin' ? 'bg-green-900 shadow-inner' : 'hover:bg-green-600'}`}
              >
                Dashboard Admin
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* KONTEN HALAMAN */}
      <div className="max-w-6xl mx-auto p-6 mt-4">
        
        {/* ========================================= */}
        {/* HALAMAN DASHBOARD UTAMA         */}
        {/* ========================================= */}
        {activeTab === 'utama' && (
          <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8">
            <h1 className="text-3xl font-bold text-green-700 mb-2 text-center">Deteksi Penyakit</h1>
            <p className="text-gray-500 text-center mb-8">Unggah foto daun tanaman untuk dianalisis oleh AI</p>

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
                {loading ? 'Mengirim ke Cloud & Menganalisis...' : 'Analisis Tanaman'}
              </button>
            </div>

            {error && (
              <div className="p-4 bg-red-100 text-red-700 rounded-lg mb-4 text-center">
                {error}
              </div>
            )}

            {result && (
              <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
                <h2 className="text-xl font-bold text-green-800 mb-4">Hasil Diagnosis:</h2>
                <div className="whitespace-pre-wrap text-gray-700 leading-relaxed text-sm">
                  {result}
                </div>
              </div>
            )}
          </div>
        )}


        {/* ========================================= */}
        {/* HALAMAN DASHBOARD ADMIN         */}
        {/* ========================================= */}
        {activeTab === 'admin' && (
          <div className="max-w-5xl mx-auto">
            
            {/* Jika Belum Login */}
            {!isLoggedIn ? (
              <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-8 mt-10 border-t-4 border-green-700">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Login Sistem Admin</h2>
                
                {/* Papan Informasi untuk Dosen */}
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm p-4 rounded-lg mb-6">
                  <p className="font-bold mb-1">📌 Info Kredensial (Penguji):</p>
                  <ul className="list-disc ml-5">
                    <li>Username: <b>admin</b></li>
                    <li>Password: <b>12345</b></li>
                  </ul>
                </div>

                <form onSubmit={handleLogin} className="flex flex-col gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                    <input 
                      type="text" 
                      className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-green-500 focus:outline-none"
                      value={loginInput.username}
                      onChange={(e) => setLoginInput({...loginInput, username: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <input 
                      type="password" 
                      className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-green-500 focus:outline-none"
                      value={loginInput.password}
                      onChange={(e) => setLoginInput({...loginInput, password: e.target.value})}
                      required
                    />
                  </div>
                  
                  {loginError && <p className="text-red-500 text-sm font-medium">{loginError}</p>}
                  
                  <button type="submit" className="w-full bg-gray-800 text-white font-bold py-3 rounded-lg hover:bg-gray-900 transition-colors mt-2">
                    Masuk ke Dashboard
                  </button>
                </form>
              </div>
            ) : (
              
              /* Jika Sudah Login */
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">Riwayat Infrastruktur Cloud</h2>
                    <p className="text-gray-500 text-sm">Klik gambar untuk memvalidasi jalur CDN Cloudflare R2</p>
                  </div>
                  <button 
                    onClick={() => {
                      setIsLoggedIn(false);
                      setLoginInput({username: '', password: ''});
                    }}
                    className="bg-red-100 text-red-600 px-4 py-2 rounded-lg font-bold hover:bg-red-200"
                  >
                    Logout
                  </button>
                </div>

                {history.length === 0 ? (
                  <div className="bg-white rounded-xl shadow p-10 text-center text-gray-500 border border-gray-200">
                    <span className="text-4xl block mb-3">📭</span>
                    Belum ada riwayat gambar di sesi ini.<br/>Silakan lakukan unggah foto di Dashboard Utama terlebih dahulu.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {history.map((item) => (
                      <div key={item.id} className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-shadow">
                        
                        {/* Gambar bisa diklik dan buka tab baru ke CDN Cloudflare */}
                        <a href={item.imageUrl} target="_blank" rel="noopener noreferrer" className="block relative group">
                          <img src={item.imageUrl} alt={item.filename} className="w-full h-48 object-cover" />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center">
                            <span className="text-white font-bold opacity-0 group-hover:opacity-100 bg-black bg-opacity-70 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                              <span>🔗</span> Buka Link CDN R2
                            </span>
                          </div>
                        </a>
                        
                        <div className="p-4">
                          <p className="text-xs text-gray-400 mb-2">{item.date}</p>
                          <p className="text-sm font-semibold text-gray-800 truncate mb-1" title={item.filename}>
                            {item.filename}
                          </p>
                          <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded border border-gray-100 h-20 overflow-y-auto">
                            {item.analysis}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

export default App