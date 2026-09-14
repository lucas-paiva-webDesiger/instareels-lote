import { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, Trash2, XCircle } from 'lucide-react';

export function Schedules() {
  const [videos, setVideos] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [isCanceling, setIsCanceling] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [vidsRes, accsRes] = await Promise.all([
        axios.get('/api/videos'),
        axios.get('/api/accounts')
      ]);
      setVideos(vidsRes.data.filter((v: any) => v.scheduledAt && (v.status === 'READY' || v.status === 'QUEUED')));
      setAccounts(accsRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const getAccountInfo = (accountId: string) => {
    const acc = accounts.find(a => a.id === accountId);
    return acc ? `@${acc.username}` : 'Conta Desconhecida';
  };

  const handleRemoveSchedule = async (id: string) => {
    if (confirm('Remover o agendamento? O vídeo voltará para a fila manual.')) {
      await axios.put(`/api/videos/${id}`, { scheduledAt: null });
      fetchData();
    }
  };

  const handleCancelAll = async () => {
    if (!selectedAccount) {
      alert('Selecione uma conta primeiro!');
      return;
    }
    
    const accountVids = videos.filter(v => v.accountId === selectedAccount);
    if (accountVids.length === 0) {
      alert('Nenhum vídeo agendado para esta conta.');
      return;
    }

    if (confirm(`Tem certeza que deseja cancelar TODOS os ${accountVids.length} agendamentos desta conta?\nEles voltarão para a fila.`)) {
      setIsCanceling(true);
      try {
        await Promise.all(accountVids.map(v => 
          axios.put(`/api/videos/${v.id}`, { scheduledAt: null })
        ));
        await fetchData();
        alert('Todos os agendamentos foram cancelados com sucesso!');
      } catch (err) {
        alert('Ocorreu um erro ao cancelar alguns vídeos.');
      } finally {
        setIsCanceling(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Agendamentos</h1>
          <p className="text-slate-400">Reels programados para publicação em data/hora específica.</p>
        </div>
        
        <div className="flex items-center gap-3 bg-slate-800 p-2 rounded-lg border border-slate-700">
          <select 
            className="bg-slate-900 border border-slate-700 text-white text-sm rounded px-3 py-2 outline-none"
            value={selectedAccount}
            onChange={e => setSelectedAccount(e.target.value)}
          >
            <option value="">Selecione a conta...</option>
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>@{acc.username}</option>
            ))}
          </select>
          <button 
            onClick={handleCancelAll}
            disabled={isCanceling || !selectedAccount}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm font-medium flex items-center gap-2 disabled:opacity-50 transition-colors"
          >
            <XCircle className="w-4 h-4" />
            {isCanceling ? 'Cancelando...' : 'Cancelar Todos'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {videos.length === 0 ? (
          <div className="col-span-full bg-slate-800 p-8 rounded-xl border border-slate-700 text-center text-slate-400">
            Nenhum Reel agendado no momento.
          </div>
        ) : (
          videos.map((vid) => (
            <div key={vid.id} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex flex-col">
              <div className="h-40 bg-slate-900 relative">
                {vid.coverUrl ? (
                  <img src={vid.coverUrl} className="w-full h-full object-cover opacity-80" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600">Sem Capa</div>
                )}
                <div className="absolute top-3 left-3 bg-indigo-500/90 text-white text-xs px-2.5 py-1 rounded font-bold flex items-center gap-1.5 shadow-lg backdrop-blur-sm">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(vid.scheduledAt).toLocaleString()}
                </div>
              </div>
              
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-white truncate pr-4">{vid.filename}</h3>
                </div>
                <p className="text-sm text-slate-400 line-clamp-2 mb-4 flex-1">{vid.caption || 'Sem legenda...'}</p>
                
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-700/50">
                  <span className="text-sm font-medium text-blue-400">{getAccountInfo(vid.accountId)}</span>
                  <div className="flex gap-2">
                    <button onClick={() => handleRemoveSchedule(vid.id)} className="p-1.5 text-red-400 hover:bg-red-400/10 rounded" title="Cancelar Agendamento">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
