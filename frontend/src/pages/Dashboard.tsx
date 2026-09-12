import { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity, Users, Video, CalendarCheck2 } from 'lucide-react';

export function Dashboard() {
  const [stats, setStats] = useState({
    accounts: 0,
    queue: 0,
    publishedToday: 0,
    automationStatus: 'CARREGANDO'
  });

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [vidsRes, accsRes] = await Promise.all([
        axios.get('/api/videos'),
        axios.get('/api/accounts')
      ]);

      const videos = vidsRes.data;
      const accounts = accsRes.data;

      // Conta vídeos publicados hoje
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const publishedToday = videos.filter((v: any) => 
        v.status === 'PUBLISHED' && new Date(v.updatedAt) >= today
      ).length;

      const queueCount = videos.filter((v: any) => v.status === 'QUEUED' || v.status === 'READY').length;
      
      // Se tiver pelo menos uma conta conectada e sem erro, automação está ativa
      const isAutomationActive = accounts.length > 0 && accounts.some((a: any) => !a.isAutomationPaused);

      setStats({
        accounts: accounts.length,
        queue: queueCount,
        publishedToday,
        automationStatus: accounts.length === 0 ? 'DESATIVADA' : (isAutomationActive ? 'ATIVA' : 'PAUSADA')
      });
    } catch (err) {
      console.error(err);
      setStats(s => ({ ...s, automationStatus: 'ERRO' }));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard Principal</h1>
        <p className="text-slate-400">Visão em tempo real do seu Reels Manager.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm flex items-start justify-between">
          <div>
            <h3 className="text-sm font-medium text-slate-400">Contas Conectadas</h3>
            <p className="text-3xl font-bold mt-2 text-white">{stats.accounts} <span className="text-lg text-slate-500">/ 6</span></p>
          </div>
          <div className="p-3 bg-blue-500/20 text-blue-400 rounded-lg"><Users className="w-6 h-6" /></div>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm flex items-start justify-between">
          <div>
            <h3 className="text-sm font-medium text-slate-400">Vídeos na Fila</h3>
            <p className="text-3xl font-bold mt-2 text-white">{stats.queue}</p>
          </div>
          <div className="p-3 bg-purple-500/20 text-purple-400 rounded-lg"><Video className="w-6 h-6" /></div>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm flex items-start justify-between">
          <div>
            <h3 className="text-sm font-medium text-slate-400">Publicados Hoje</h3>
            <p className="text-3xl font-bold mt-2 text-white">{stats.publishedToday}</p>
          </div>
          <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-lg"><CalendarCheck2 className="w-6 h-6" /></div>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm flex items-start justify-between">
          <div>
            <h3 className="text-sm font-medium text-slate-400">Worker de Fila</h3>
            <p className={`text-2xl font-bold mt-2 ${stats.automationStatus === 'ATIVA' ? 'text-emerald-400' : 'text-orange-400'}`}>
              {stats.automationStatus}
            </p>
          </div>
          <div className={`p-3 rounded-lg ${stats.automationStatus === 'ATIVA' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 text-orange-400'}`}>
            <Activity className="w-6 h-6" />
          </div>
        </div>
      </div>
    </div>
  );
}
