import { useState, useEffect } from 'react';
import axios from 'axios';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, ChevronRight } from 'lucide-react';

export function AccountSelect() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session_id');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!sessionId) {
      navigate('/accounts');
      return;
    }

    axios.get(`/api/accounts/meta/available?session_id=${sessionId}`)
      .then(res => {
        setAccounts(res.data);
      })
      .catch(err => {
        setError(err.response?.data?.error || 'Não foi possível carregar as contas disponíveis.');
      })
      .finally(() => setLoading(false));
  }, [sessionId]);

  const handleSelect = async (instagramId: string, defaultName: string) => {
    try {
      await axios.post('/api/accounts/meta/select', {
        session_id: sessionId,
        instagramId,
        internalName: defaultName
      });
      // Retorna com sucesso
      navigate('/accounts');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao vincular conta.');
    }
  };

  if (loading) {
    return <div className="text-center p-12 text-white">Buscando contas autorizadas...</div>;
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-slate-800 rounded-xl border border-red-500/50 text-center">
        <h2 className="text-xl font-bold text-red-400 mb-2">Erro</h2>
        <p className="text-slate-300 mb-6">{error}</p>
        <button onClick={() => navigate('/accounts')} className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded text-white">Voltar</button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Selecione a Conta do Instagram</h1>
        <p className="text-slate-400">Encontramos as seguintes contas profissionais vinculadas à autorização.</p>
      </div>

      {accounts.length === 0 ? (
        <div className="bg-slate-800 p-8 rounded-xl border border-slate-700 text-center">
          <p className="text-slate-300">Nenhuma conta Profissional ou Creator encontrada vinculada às páginas selecionadas.</p>
          <button onClick={() => navigate('/accounts')} className="mt-4 bg-slate-700 px-4 py-2 rounded text-white">Voltar</button>
        </div>
      ) : (
        <div className="space-y-4">
          {accounts.map(acc => (
            <div key={acc.instagramId} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex items-center justify-between hover:bg-slate-700/50 transition-colors">
              <div className="flex items-center gap-4">
                {acc.profilePictureUrl ? (
                  <img src={acc.profilePictureUrl} alt={acc.name} className="w-14 h-14 rounded-full" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-slate-600 flex items-center justify-center font-bold text-xl text-white">
                    {acc.name?.charAt(0) || '@'}
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-lg text-white">{acc.name}</h3>
                  <p className="text-blue-400">@{acc.username}</p>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Conta Profissional verificada
                  </p>
                </div>
              </div>
              <button 
                onClick={() => handleSelect(acc.instagramId, acc.name)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2"
              >
                Conectar <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
