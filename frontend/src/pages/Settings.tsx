import { useState, useEffect } from 'react';
import axios from 'axios';

export function Settings() {
  const [metaAppId, setMetaAppId] = useState('');
  const [metaAppSecret, setMetaAppSecret] = useState('');
  const [globalInterval, setGlobalInterval] = useState(60);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    axios.get('/api/settings')
      .then(res => {
        if (res.data.metaAppId) setMetaAppId(res.data.metaAppId);
        if (res.data.metaAppSecret) setMetaAppSecret(res.data.metaAppSecret);
        if (res.data.globalInterval) setGlobalInterval(res.data.globalInterval);
      })
      .catch(err => console.error(err));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    try {
      await axios.put('/api/settings', {
        metaAppId,
        metaAppSecret,
        globalInterval
      });
      setMessage('Configurações salvas com sucesso!');
    } catch (error) {
      setMessage('Erro ao salvar configurações.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Configurações do Sistema</h1>
        <p className="text-slate-400">Configure as chaves da Meta Graph API para a integração do Reels Manager.</p>
      </div>

      <form onSubmit={handleSave} className="bg-slate-800 p-6 rounded-xl border border-slate-700 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Meta App ID</label>
          <input
            type="text"
            value={metaAppId}
            onChange={e => setMetaAppId(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
            placeholder="Ex: 1234567890"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Meta App Secret</label>
          <input
            type="text"
            value={metaAppSecret}
            onChange={e => setMetaAppSecret(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
            placeholder="Chave secreta"
          />
        </div>

        {message && (
          <div className={`p-3 rounded-lg text-sm ${message.includes('Erro') ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </form>
    </div>
  );
}
