import { useState, useEffect } from 'react';
import axios from 'axios';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';

export function History() {
  const [videos, setVideos] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [vidsRes, accsRes] = await Promise.all([
        axios.get('http://localhost:3000/api/videos'),
        axios.get('http://localhost:3000/api/accounts')
      ]);
      setVideos(vidsRes.data.filter((v: any) => v.status === 'PUBLISHED' || v.status === 'ERROR' || v.status === 'FAILED'));
      setAccounts(accsRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const getAccountInfo = (accountId: string) => {
    const acc = accounts.find(a => a.id === accountId);
    return acc ? `@${acc.username}` : 'Conta Desconhecida';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Histórico de Publicação</h1>
        <p className="text-slate-400">Acompanhe todos os Reels que já foram processados pelo sistema.</p>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-900 border-b border-slate-700 text-slate-400">
            <tr>
              <th className="p-4 font-medium">Vídeo</th>
              <th className="p-4 font-medium">Conta</th>
              <th className="p-4 font-medium">Data/Hora</th>
              <th className="p-4 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {videos.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-400">
                  Nenhum registro no histórico.
                </td>
              </tr>
            ) : (
              videos.map((vid) => (
                <tr key={vid.id} className="hover:bg-slate-700/20">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {vid.coverUrl ? (
                        <img src={vid.coverUrl} className="w-12 h-16 object-cover rounded bg-slate-900" />
                      ) : (
                        <div className="w-12 h-16 bg-slate-700 rounded flex items-center justify-center">
                          <span className="text-xs text-slate-500">Sem Capa</span>
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-white line-clamp-1">{vid.filename}</p>
                        <p className="text-sm text-slate-400 line-clamp-1">{vid.caption || 'Sem legenda'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-blue-400">{getAccountInfo(vid.accountId)}</td>
                  <td className="p-4 text-slate-300">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-500" />
                      {new Date(vid.updatedAt).toLocaleString()}
                    </div>
                  </td>
                  <td className="p-4">
                    {vid.status === 'PUBLISHED' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Publicado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/20" title={vid.error || ''}>
                        <XCircle className="w-3.5 h-3.5" /> Falhou
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
