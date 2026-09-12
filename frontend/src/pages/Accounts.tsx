import { useState, useEffect } from 'react';
import axios from 'axios';
import { Trash2, Plus, Settings, AlertCircle, RefreshCw } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

export function Accounts() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [searchParams] = useSearchParams();
  const errorMsg = searchParams.get('error');

  const fetchAccounts = async () => {
    try {
      const res = await axios.get('/api/accounts');
      setAccounts(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleConnect = () => {
    // Redireciona o browser inteiro para o endpoint que inicia o OAuth
    window.location.href = '/api/accounts/meta';
  };

  const handleDelete = async (id: string) => {
    if (confirm('Desconectar esta conta?\nA conta será removida do Reels Manager. Isso não exclui a conta do Instagram.')) {
      await axios.delete(`/api/accounts/${id}`);
      fetchAccounts();
    }
  };

  const togglePause = async (id: string, isPaused: boolean) => {
    await axios.put(`/api/accounts/${id}/settings`, { isAutomationPaused: !isPaused });
    fetchAccounts();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Contas Conectadas</h1>
          <p className="text-slate-400">Gerencie até 6 contas do Instagram através da Meta.</p>
        </div>
        <button 
          onClick={handleConnect}
          disabled={accounts.length >= 6}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
        >
          <Plus className="w-5 h-5" /> Conectar com Meta
        </button>
      </div>

      {errorMsg && (
        <div className="bg-red-500/20 border border-red-500/50 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-red-400" />
          <div>
            <h3 className="text-red-400 font-bold">Erro ao conectar conta</h3>
            <p className="text-red-300 text-sm">{errorMsg}</p>
          </div>
        </div>
      )}

      {accounts.length === 0 && !errorMsg && (
        <div className="bg-slate-800 p-8 rounded-xl border border-slate-700 text-center">
          <p className="text-slate-400 mb-4">Nenhuma conta vinculada ainda.</p>
          <button onClick={handleConnect} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg inline-flex items-center gap-2">
             🔵 Conectar com Meta
          </button>
          <p className="text-xs text-slate-500 mt-3">Você poderá escolher qual conta profissional deseja adicionar após a autorização.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {accounts.map(account => (
          <div key={account.id} className="bg-slate-800 p-6 rounded-xl border border-slate-700">
            <div className="flex justify-between items-start">
              <div className="flex gap-4">
                {account.profilePictureUrl ? (
                  <img src={account.profilePictureUrl} alt={account.name} className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-xl font-bold">
                    {account.name.charAt(0)}
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-bold text-white truncate max-w-[150px]">{account.name}</h3>
                  <p className="text-blue-400">@{account.username}</p>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex items-center justify-between">
              <span className="text-slate-400 text-sm flex items-center gap-2">
                Status: 
                {account.status === 'CONNECTED' && <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>}
                {account.status === 'ERROR' && <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>}
              </span>
              <span className={`px-2 py-1 text-xs font-bold rounded ${account.status === 'CONNECTED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                {account.status === 'CONNECTED' ? 'Conectada' : 'Reconectar'}
              </span>
            </div>
            
            <div className="mt-4 pt-4 border-t border-slate-700 grid grid-cols-3 gap-2 text-center">
              <button 
                onClick={() => togglePause(account.id, account.isAutomationPaused)}
                className={`text-sm ${account.isAutomationPaused ? 'text-orange-400' : 'text-slate-300 hover:text-white'}`}
              >
                {account.isAutomationPaused ? 'Retomar' : 'Pausar'}
              </button>
              
              <button onClick={() => handleDelete(account.id)} className="text-sm text-red-400 hover:text-red-300 flex items-center justify-center gap-1">
                Remover
              </button>

              <button className="text-sm text-slate-300 hover:text-white flex items-center justify-center gap-1">
                <Settings className="w-4 h-4" /> Config
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
