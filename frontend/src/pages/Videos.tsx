import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Upload, Play, Check, Trash2, XOctagon } from 'lucide-react';

export function Videos() {
  const [videos, setVideos] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const fetchData = async () => {
    try {
      const [vidsRes, accsRes] = await Promise.all([
        axios.get(`/api/videos${selectedAccountId ? `?accountId=${selectedAccountId}` : ''}`),
        axios.get('/api/accounts')
      ]);
      setVideos(vidsRes.data);
      setAccounts(accsRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [selectedAccountId]);

  const handleDeleteAllReady = async () => {
    if (!selectedAccountId) return alert('Selecione uma conta no filtro acima primeiro.');
    const readyVideos = videos.filter(v => v.accountId === selectedAccountId);
    if (readyVideos.length === 0) return alert('Nenhum vídeo nesta conta.');
    if (!confirm(`Tem certeza que deseja APAGAR DEFINITIVAMENTE todos os ${readyVideos.length} vídeos desta conta?`)) return;
    try {
      await Promise.all(readyVideos.map(v => axios.delete(`/api/videos/${v.id}`)));
      fetchData();
      alert('Vídeos apagados com sucesso!');
    } catch(e) {
      alert('Erro ao apagar alguns vídeos.');
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedAccountId) {
      alert('Selecione uma conta e um ou mais arquivos.');
      return;
    }

    setUploading(true);
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('video', file);
        formData.append('accountId', selectedAccountId);

        await axios.post('/api/videos/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      fetchData();
    } catch (error) {
      alert('Erro no upload de um ou mais arquivos');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleQueueVideo = async (id: string, caption: string, status: string = 'QUEUED', scheduledAt?: string) => {
    try {
      await axios.put(`/api/videos/${id}`, {
        status,
        caption,
        scheduledAt: scheduledAt || null
      });
      fetchData();
    } catch (err) {
      alert('Erro ao processar vídeo');
    }
  };

  const handleDeleteVideo = async (id: string) => {
    if (!confirm('Tem certeza que deseja apagar este vídeo?')) return;
    try {
      await axios.delete(`/api/videos/${id}`);
      fetchData();
    } catch (err) {
      alert('Erro ao apagar vídeo');
    }
  };

  const [batchMode, setBatchMode] = useState<'GRID' | 'INTERVAL'>('INTERVAL');
  const [batchStartDate, setBatchStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [batchTimes, setBatchTimes] = useState('10:00, 15:00, 19:00');
  const [batchDays, setBatchDays] = useState([1, 2, 3, 4, 5]); // 1=Seg, 0=Dom
  
  const [intervalStartDate, setIntervalStartDate] = useState('');
  const [batchInterval, setBatchInterval] = useState(60);

  const toggleDay = (d: number) => {
    setBatchDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort());
  };

  const handleBatchSchedule = async () => {
    const readyVideos = videos.filter(v => v.status === 'READY' || v.status === 'UPLOADED');
    if (readyVideos.length === 0) return alert('Nenhum vídeo com status READY para agendar.');
    
    let scheduledDates: string[] = [];

    if (batchMode === 'GRID') {
      if (batchDays.length === 0) return alert('Selecione pelo menos um dia da semana.');
      const times = batchTimes.split(',').map(t => t.trim()).filter(t => /^\d{1,2}:\d{2}$/.test(t));
      if (times.length === 0) return alert('Digite os horários no formato HH:MM separados por vírgula.');

      const parsedTimes = times.map(t => {
        const [h, m] = t.split(':');
        return { h: parseInt(h), m: parseInt(m) };
      }).sort((a, b) => (a.h * 60 + a.m) - (b.h * 60 + b.m));

      if (!confirm(`Agendar ${readyVideos.length} vídeos nos dias selecionados nos horários: ${times.join(', ')}?`)) return;

      let currentDate = new Date(`${batchStartDate}T00:00:00`);
      const now = new Date();
      if (currentDate < now) currentDate = now;
      
      for (let i = 0; i < readyVideos.length; i++) {
        let slotFound = false;
        while (!slotFound) {
          if (batchDays.includes(currentDate.getDay())) {
            for (const time of parsedTimes) {
              const candidateDate = new Date(currentDate);
              candidateDate.setHours(time.h, time.m, 0, 0);
              if (candidateDate >= currentDate && candidateDate > now) {
                scheduledDates.push(candidateDate.toISOString());
                slotFound = true;
                currentDate = new Date(candidateDate.getTime() + 60000); 
                break;
              }
            }
          }
          if (!slotFound) {
            const nextDay = new Date(currentDate);
            nextDay.setDate(nextDay.getDate() + 1);
            nextDay.setHours(0, 0, 0, 0);
            currentDate = nextDay;
          }
        }
      }
    } else {
      if (!intervalStartDate) return alert('Selecione uma data e hora inicial.');
      if (!confirm(`Deseja agendar ${readyVideos.length} vídeos começando em ${new Date(intervalStartDate).toLocaleString()} com intervalo de ${batchInterval} minutos?`)) return;
      
      let currentDateTime = new Date(intervalStartDate).getTime();
      const intervalMs = batchInterval * 60000;
      for (let i = 0; i < readyVideos.length; i++) {
        scheduledDates.push(new Date(currentDateTime).toISOString());
        currentDateTime += intervalMs;
      }
    }

    // Grava no banco
    for (let i = 0; i < readyVideos.length; i++) {
      try {
        await axios.put(`/api/videos/${readyVideos[i].id}`, {
          status: 'QUEUED',
          caption: readyVideos[i].caption,
          scheduledAt: scheduledDates[i]
        });
      } catch (e) {
        console.error('Failed to batch schedule video', readyVideos[i].id);
      }
    }
    
    fetchData();
    alert('Agendamento em lote concluído com sucesso!');
  };

  const handleApplyCaptionToAll = async (caption: string) => {
    if (!confirm('Deseja aplicar essa legenda a todos os vídeos com status READY ou UPLOADED?')) return;
    const readyVideos = videos.filter(v => v.status === 'READY' || v.status === 'UPLOADED');
    
    for (const v of readyVideos) {
      try {
        await axios.put(`/api/videos/${v.id}`, { caption });
      } catch (e) {
        console.error('Failed to apply caption to video', v.id);
      }
    }
    fetchData();
    alert('Legenda aplicada a todos os vídeos!');
  };

  const handleApplyCoverToAll = async (coverUrl: string) => {
    if (!confirm('Deseja aplicar essa capa a todos os vídeos com status READY ou UPLOADED?')) return;
    const readyVideos = videos.filter(v => v.status === 'READY' || v.status === 'UPLOADED');
    
    for (const v of readyVideos) {
      if (v.coverUrl === coverUrl) continue;
      try {
        await axios.put(`/api/videos/${v.id}`, { coverUrl });
      } catch (e) {
        console.error('Failed to apply cover to video', v.id);
      }
    }
    fetchData();
    alert('Capa aplicada a todos os vídeos!');
  };

  const readyCount = videos.filter(v => v.status === 'READY' || v.status === 'UPLOADED').length;

  const weekDays = [
    { id: 0, label: 'Dom' }, { id: 1, label: 'Seg' }, { id: 2, label: 'Ter' },
    { id: 3, label: 'Qua' }, { id: 4, label: 'Qui' }, { id: 5, label: 'Sex' }, { id: 6, label: 'Sáb' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Vídeos</h1>
          <p className="text-slate-400">Agendamento em Lote Avançado.</p>
        </div>

        <div className="flex items-center gap-4">
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

          <button 
            onClick={handleDeleteAllReady}
            disabled={!selectedAccountId}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
            title="Apagar Todos da Fila desta Conta"
          >
            <XOctagon className="w-5 h-5" /> Apagar Fila
          </button>

          <input type="file" multiple accept="video/mp4,video/quicktime" ref={fileInputRef} onChange={handleUpload} className="hidden" />
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={!selectedAccountId || uploading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
          >
            <Upload className="w-5 h-5" /> {uploading ? 'Enviando...' : 'Upload Lote'}
          </button>
        </div>
      </div>

      {readyCount > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          <div className="flex border-b border-slate-700">
            <button 
              onClick={() => setBatchMode('INTERVAL')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${batchMode === 'INTERVAL' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-700/50'}`}
            >
              Intervalo Fixo
            </button>
            <button 
              onClick={() => setBatchMode('GRID')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${batchMode === 'GRID' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-700/50'}`}
            >
              Grade de Horários
            </button>
          </div>
          
          <div className="p-6 space-y-4">
            {batchMode === 'GRID' ? (
              <>
                <p className="text-slate-400 text-sm mb-4">Distribua os vídeos automaticamente nos horários exatos permitidos.</p>
                <div className="flex flex-wrap items-start gap-6">
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">A partir do dia</label>
                    <input 
                      type="date" 
                      value={batchStartDate}
                      onChange={e => setBatchStartDate(e.target.value)}
                      className="bg-slate-900 border border-slate-700 text-white rounded px-3 py-2 text-sm"
                    />
                  </div>
                  
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm text-slate-300 mb-1">Horários de Postagem (separados por vírgula)</label>
                    <input 
                      type="text" 
                      value={batchTimes}
                      onChange={e => setBatchTimes(e.target.value)}
                      placeholder="10:00, 15:30, 20:00"
                      className="bg-slate-900 border border-slate-700 text-white rounded px-3 py-2 text-sm w-full"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-2">Dias da semana permitidos</label>
                  <div className="flex flex-wrap gap-2">
                    {weekDays.map(day => (
                      <button
                        key={day.id}
                        onClick={() => toggleDay(day.id)}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${batchDays.includes(day.id) ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                <p className="text-slate-400 text-sm mb-4">Poste vídeos consecutivamente, aguardando um tempo fixo entre cada um.</p>
                <div className="flex flex-wrap items-end gap-4">
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Data/Hora do 1º Post</label>
                    <input 
                      type="datetime-local" 
                      value={intervalStartDate}
                      onChange={e => setIntervalStartDate(e.target.value)}
                      className="bg-slate-900 border border-slate-700 text-white rounded px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Intervalo (Minutos)</label>
                    <input 
                      type="number" 
                      min="1"
                      value={batchInterval}
                      onChange={e => setBatchInterval(Number(e.target.value))}
                      className="bg-slate-900 border border-slate-700 text-white rounded px-3 py-2 text-sm w-24"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="pt-4 mt-4 border-t border-slate-700/50">
              <button 
                onClick={handleBatchSchedule}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg text-sm font-bold w-full md:w-auto shadow-lg shadow-emerald-900/20"
              >
                Distribuir {readyCount} Vídeos na Fila
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {videos.map(video => (
          <VideoCard 
            key={video.id} 
            video={video} 
            onQueue={handleQueueVideo} 
            onDelete={handleDeleteVideo}
            onApplyCaptionToAll={handleApplyCaptionToAll}
            onApplyCoverToAll={handleApplyCoverToAll}
            onCoverUploaded={fetchData}
            accounts={accounts} 
          />
        ))}
      </div>
    </div>
  );
}

function VideoCard({ video, onQueue, onDelete, onApplyCaptionToAll, onApplyCoverToAll, onCoverUploaded, accounts }: { 
  video: any, 
  onQueue: (id: string, cap: string, status?: string, scheduledAt?: string) => void, 
  onDelete: (id: string) => void, 
  onApplyCaptionToAll: (cap: string) => void,
  onApplyCoverToAll: (coverUrl: string) => void,
  onCoverUploaded: () => void,
  accounts: any[] 
}) {
  const [caption, setCaption] = useState(video.caption || '');
  const [scheduledAt, setScheduledAt] = useState(video.scheduledAt ? new Date(video.scheduledAt).toISOString().slice(0, 16) : '');
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const account = accounts.find(a => a.id === video.accountId);

  const handleAction = (action: 'QUEUE' | 'SCHEDULE' | 'PUBLISH_NOW') => {
    let status = video.status;
    let schedDate = undefined;

    if (action === 'QUEUE') status = 'QUEUED';
    if (action === 'SCHEDULE') {
      if (!scheduledAt) return alert('Selecione uma data e hora para agendar.');
      status = 'QUEUED'; 
      schedDate = new Date(scheduledAt).toISOString();
    }
    if (action === 'PUBLISH_NOW') {
      status = 'QUEUED';
      schedDate = new Date(Date.now() - 60000).toISOString();
    }

    onQueue(video.id, caption, status, schedDate);
  };

  const handleUploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCover(true);
    const formData = new FormData();
    formData.append('cover', file);

    try {
      await axios.post(`/api/videos/${video.id}/cover`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      onCoverUploaded();
    } catch (error) {
      alert('Erro ao fazer upload da capa');
    } finally {
      setUploadingCover(false);
    }
  };

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex flex-col">
      <div className="aspect-[9/16] bg-slate-900 relative group overflow-hidden">
        {video.coverUrl ? (
          <img src={video.coverUrl} className="w-full h-full object-cover" alt="Cover" />
        ) : (
          <video src={video.fileUrl} className="w-full h-full object-cover" />
        )}
        
        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-3">
          <Play className="w-12 h-12 text-white" />
          
          {(video.status === 'READY' || video.status === 'UPLOADED') && (
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => coverInputRef.current?.click()}
                className="bg-white/20 hover:bg-white/30 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm"
              >
                {uploadingCover ? 'Enviando...' : (video.coverUrl ? 'Trocar Capa' : 'Adicionar Capa')}
              </button>
              
              {video.coverUrl && (
                <button 
                  onClick={() => onApplyCoverToAll(video.coverUrl)}
                  className="bg-blue-600/80 hover:bg-blue-600 text-white text-[10px] px-3 py-1 rounded-full backdrop-blur-sm shadow-lg"
                  title="Copiar esta mesma imagem de capa para todos os vídeos"
                >
                  Aplicar em Todos
                </button>
              )}
              
              <input type="file" accept="image/jpeg,image/png" ref={coverInputRef} onChange={handleUploadCover} className="hidden" />
            </div>
          )}
        </div>
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <p className="text-xs text-blue-400 mb-2">@{account?.username}</p>
        <p className="text-sm font-medium text-white truncate mb-2">{video.filename}</p>
        
        <div className="relative mb-3">
          <textarea 
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Legenda do Reel..."
            className="w-full bg-slate-900 border border-slate-700 rounded p-2 pb-8 text-sm text-white resize-none h-24"
            disabled={video.status !== 'READY' && video.status !== 'UPLOADED'}
          />
          {(video.status === 'READY' || video.status === 'UPLOADED') && (
            <button 
              onClick={() => onApplyCaptionToAll(caption)}
              title="Copiar legenda para todos os vídeos na tela"
              className="absolute bottom-2 right-2 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded"
            >
              Aplicar em Todos
            </button>
          )}
        </div>

        {(video.status === 'READY' || video.status === 'UPLOADED') && (
          <div className="mb-3">
            <label className="text-xs text-slate-400 mb-1 block">Agendar para (opcional):</label>
            <input 
              type="datetime-local" 
              value={scheduledAt}
              onChange={e => setScheduledAt(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white"
            />
          </div>
        )}

        <div className="mt-auto flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className={`text-xs px-2 py-1 rounded-full ${
              video.status === 'READY' ? 'bg-slate-700 text-slate-300' : 
              video.status === 'QUEUED' ? 'bg-blue-500/20 text-blue-400' :
              video.status === 'PUBLISHED' ? 'bg-emerald-500/20 text-emerald-400' :
              'bg-orange-500/20 text-orange-400'
            }`}>
              {video.status}
            </span>
            <button onClick={() => onDelete(video.id)} className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1">
              <Trash2 className="w-4 h-4" /> Apagar
            </button>
          </div>
          
          {(video.status === 'READY' || video.status === 'UPLOADED') && (
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button 
                onClick={() => handleAction(scheduledAt ? 'SCHEDULE' : 'QUEUE')}
                className="bg-slate-700 hover:bg-slate-600 text-white text-xs py-2 rounded font-medium"
              >
                {scheduledAt ? 'Agendar' : 'Add na Fila'}
              </button>
              <button 
                onClick={() => handleAction('PUBLISH_NOW')}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs py-2 rounded font-medium"
              >
                Publicar Agora
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
