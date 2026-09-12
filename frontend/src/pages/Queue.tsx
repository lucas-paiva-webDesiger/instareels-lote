import { useState, useEffect } from 'react';
import axios from 'axios';
import { Clock, PlayCircle } from 'lucide-react';
import dayjs from 'dayjs';

export function Queue() {
  const [videos, setVideos] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');

  const fetchData = async () => {
    try {
      const [vidsRes, accsRes] = await Promise.all([
        axios.get(`/api/videos${selectedAccountId ? `?accountId=${selectedAccountId}` : ''}`),
        axios.get('/api/accounts')
      ]);
      setVideos(vidsRes.data.filter((v: any) => v.status === 'QUEUED' || v.status === 'SCHEDULED' || v.status === 'PROCESSING'));
      setAccounts(accsRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Polling simples a cada 10s
    return () => clearInterval(interval);
  }, [selectedAccountId]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Fila de Publicação</h1>
          <p className="text-slate-400">Acompanhe os próximos Reels a serem publicados pelo Worker.</p>
        </div>

        <select 
          value={selectedAccountId} 
          onChange={(e) => setSelectedAccountId(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2"
        >
          <option value="">Todas as Contas</option>
          {accounts.map(acc => (
            <option key={acc.id} value={acc.id}>@{acc.username}</option>
          ))}
        </select>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-900 border-b border-slate-700 text-slate-400 text-sm">
            <tr>
              <th className="px-6 py-4 font-medium">Data/Hora Agendada</th>
              <th className="px-6 py-4 font-medium">Conta</th>
              <th className="px-6 py-4 font-medium">Vídeo</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium">Tentativas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {videos.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-400">Nenhum vídeo na fila.</td>
              </tr>
            )}
            {videos.map(video => {
              const account = accounts.find(a => a.id === video.accountId);
              return (
                <tr key={video.id} className="text-white hover:bg-slate-700/30 transition-colors">
                  <td className="px-6 py-4 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    {video.scheduledAt ? dayjs(video.scheduledAt).format('DD/MM/YYYY HH:mm') : 'Calculando...'}
                  </td>
                  <td className="px-6 py-4 text-blue-400">@{account?.username}</td>
                  <td className="px-6 py-4 flex items-center gap-2">
                    <PlayCircle className="w-4 h-4 text-slate-400" />
                    <span className="truncate max-w-[200px] block">{video.filename}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      video.status === 'PROCESSING' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {video.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-400">{video.attempts}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
