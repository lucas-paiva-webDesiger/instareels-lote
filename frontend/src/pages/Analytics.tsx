import { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart3, TrendingUp, CheckCircle2, XCircle, Video } from 'lucide-react';

export function Analytics() {
  const [stats, setStats] = useState<any>({
    total: 0,
    published: 0,
    failed: 0,
    queued: 0,
    accounts: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [vidsRes, accsRes] = await Promise.all([
        axios.get('/api/videos'),
        axios.get('/api/accounts')
      ]);

      const videos = vidsRes.data;
      setStats({
        total: videos.length,
        published: videos.filter((v: any) => v.status === 'PUBLISHED').length,
        failed: videos.filter((v: any) => v.status === 'ERROR' || v.status === 'FAILED').length,
        queued: videos.filter((v: any) => v.status === 'QUEUED' || v.status === 'READY').length,
        accounts: accsRes.data.length
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Analytics Geral</h1>
        <p className="text-slate-400">Visão geral do desempenho e automação do Reels Manager.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/20 text-blue-400 rounded-lg">
              <Video className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Total de Vídeos</p>
              <h3 className="text-2xl font-bold text-white">{stats.total}</h3>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Publicados c/ Sucesso</p>
              <h3 className="text-2xl font-bold text-white">{stats.published}</h3>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-500/20 text-purple-400 rounded-lg">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Na Fila / Agendados</p>
              <h3 className="text-2xl font-bold text-white">{stats.queued}</h3>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-500/20 text-red-400 rounded-lg">
              <XCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Falhas de Publicação</p>
              <h3 className="text-2xl font-bold text-white">{stats.failed}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 p-8 rounded-xl border border-slate-700 mt-8 text-center">
        <TrendingUp className="w-12 h-12 text-slate-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Integração de Insights Sociais</h3>
        <p className="text-slate-400 max-w-lg mx-auto">
          A API do Instagram exige aprovação avançada (App Review) para exibir métricas de alcance, curtidas e comentários de Contas de Criadores. Por enquanto, acompanhe suas estatísticas de postagem locais aqui.
        </p>
      </div>
    </div>
  );
}
