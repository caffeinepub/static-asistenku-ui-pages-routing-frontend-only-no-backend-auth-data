import { useState, useEffect } from 'react';
import { useActor } from '../../hooks/useActor';
import { useInternetIdentity } from '../../hooks/useInternetIdentity';
import type { LayananV4 } from '../../backend';

// Phase-to-bucket mapping (locked spec)
type BucketType = 'delegation' | 'onProgress' | 'review' | 'revisi' | 'done';

interface TaskPhaseData {
  taskId: string;
  title: string;
  detail: string;
  phase: string;
  assignedPartner: string | null;
  unitTerpakai: number | null;
  updatedAt: number;
}

export default function ClientDashboard() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();
  
  const [hasActiveService, setHasActiveService] = useState<boolean | null>(null);
  const [tasks, setTasks] = useState<TaskPhaseData[]>([]);
  const [activeBucket, setActiveBucket] = useState<BucketType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  // Fetch data on mount
  useEffect(() => {
    if (!actor || actorFetching || !identity) {
      return;
    }

    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch active services
        const principal = identity.getPrincipal();
        const layananList = await actor.listLayananV4ByClient(principal, false);
        const activeServices = layananList.filter((l: LayananV4) => l.isActive && !l.isArchived);
        setHasActiveService(activeServices.length > 0);

        // Fetch tasks - backend method not yet available, using empty array
        // TODO: Replace with actual actor.listMyTasks() when available
        setTasks([]);
        
      } catch (err: any) {
        console.error('Error fetching dashboard data:', err);
        setError('Gagal memuat data. Silakan coba lagi.');
        setHasActiveService(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [actor, actorFetching, identity]);

  // Phase mapping functions
  const getTasksForBucket = (bucket: BucketType): TaskPhaseData[] => {
    switch (bucket) {
      case 'delegation':
        return tasks.filter(t => t.phase === '#permintaan_baru' || t.phase === '#ditolak_partner');
      case 'onProgress':
        return tasks.filter(t => t.phase === '#on_progress' || t.phase === '#qa_asistenku');
      case 'review':
        return tasks.filter(t => t.phase === '#review_client');
      case 'revisi':
        return tasks.filter(t => t.phase === '#revisi');
      case 'done':
        return tasks.filter(t => t.phase === '#selesai');
      default:
        return [];
    }
  };

  const getCanceledTasks = (): TaskPhaseData[] => {
    return tasks.filter(t => t.phase === '#dibatalkan_client');
  };

  const getDelegationMessage = (task: TaskPhaseData): string => {
    if (task.phase === '#permintaan_baru' || task.phase === '#ditolak_partner') {
      if (task.unitTerpakai === null && task.assignedPartner === null) {
        return 'Asistenmu menerima permintaanmu dan akan segera mendelegasikannya.';
      } else {
        return 'Asistenmu sedang menyiapkan penugasan terbaik untukmu — mohon tunggu sebentar.';
      }
    }
    return '';
  };

  const shouldShowCancel = (task: TaskPhaseData): boolean => {
    return task.phase === '#permintaan_baru' && 
           task.unitTerpakai === null && 
           task.assignedPartner === null;
  };

  const getPhaseLabel = (phase: string): string => {
    switch (phase) {
      case '#permintaan_baru': return 'Permintaan baru';
      case '#ditolak_partner': return 'Dalam delegasi';
      case '#on_progress': return 'Sedang dikerjakan';
      case '#qa_asistenku': return 'Quality assurance';
      case '#review_client': return 'Menunggu review';
      case '#revisi': return 'Sedang disempurnakan';
      case '#selesai': return 'Selesai';
      case '#dibatalkan_client': return 'Dibatalkan';
      default: return phase;
    }
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp / 1000000); // Convert nanoseconds to milliseconds
    return date.toLocaleDateString('id-ID', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  // Bucket counts
  const reviewCount = getTasksForBucket('review').length;
  const onProgressCount = getTasksForBucket('onProgress').length;
  const delegationCount = getTasksForBucket('delegation').length;
  const doneCount = getTasksForBucket('done').length;

  // Loading state
  if (isLoading || actorFetching) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f2942] via-[#1a3a52] to-[#e8dcc4]">
        <header className="border-b border-[#d4c5a9]/20 bg-[#0f2942]/80 backdrop-blur-sm pt-4">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <img src="/assets/asistenku-horizontal.png" alt="Asistenku" height="24" className="h-6" />
            <button 
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-transparent hover:bg-[#2d9cdb]/20 text-[#e8dcc4] h-9 px-3 opacity-50 cursor-not-allowed" 
              disabled
            >
              Logout (Disabled)
            </button>
          </div>
        </header>
        <main className="flex items-center justify-center min-h-[60vh]">
          <p className="text-[#e8dcc4] text-lg">Memuat...</p>
        </main>
        <footer className="text-center text-xs text-[#e8dcc4]/80 py-8">
          Asistenku © 2026 PT. Asistenku Digital Indonesia
        </footer>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f2942] via-[#1a3a52] to-[#e8dcc4]">
        <header className="border-b border-[#d4c5a9]/20 bg-[#0f2942]/80 backdrop-blur-sm pt-4">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <img src="/assets/asistenku-horizontal.png" alt="Asistenku" height="24" className="h-6" />
            <button 
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-transparent hover:bg-[#2d9cdb]/20 text-[#e8dcc4] h-9 px-3 opacity-50 cursor-not-allowed" 
              disabled
            >
              Logout (Disabled)
            </button>
          </div>
        </header>
        <main className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-md mx-auto px-6">
            <p className="text-[#e8dcc4] text-lg mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center rounded-xl text-sm font-medium transition-colors h-10 px-6 bg-[#2d9cdb] text-white hover:bg-[#2589c4]"
            >
              Muat Ulang
            </button>
          </div>
        </main>
        <footer className="text-center text-xs text-[#e8dcc4]/80 py-8">
          Asistenku © 2026 PT. Asistenku Digital Indonesia
        </footer>
      </div>
    );
  }

  // No active service state
  if (hasActiveService === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f2942] via-[#1a3a52] to-[#e8dcc4]">
        <header className="border-b border-[#d4c5a9]/20 bg-[#0f2942]/80 backdrop-blur-sm pt-4">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <img src="/assets/asistenku-horizontal.png" alt="Asistenku" height="24" className="h-6" />
            <button 
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-transparent hover:bg-[#2d9cdb]/20 text-[#e8dcc4] h-9 px-3 opacity-50 cursor-not-allowed" 
              disabled
            >
              Logout (Disabled)
            </button>
          </div>
        </header>
        <main className="flex items-center justify-center min-h-[60vh] px-6">
          <div className="text-center max-w-2xl mx-auto space-y-8">
            <p className="text-[#e8dcc4] text-xl leading-relaxed font-serif">
              Pendampinganmu sedang kami aktifkan.
              <br />
              Silakan minum kopimu dan bersantai sejenak —
              <br />
              dalam beberapa menit, Asistenmu akan mulai bekerja untukmu.
            </p>
          </div>
        </main>
        <footer className="text-center text-xs text-[#e8dcc4]/80 py-8">
          Asistenku © 2026 PT. Asistenku Digital Indonesia
        </footer>
      </div>
    );
  }

  // Active workspace
  const activeTasks = activeBucket ? getTasksForBucket(activeBucket) : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f2942] via-[#1a3a52] to-[#e8dcc4]">
      <header className="border-b border-[#d4c5a9]/20 bg-[#0f2942]/80 backdrop-blur-sm pt-4">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <img src="/assets/asistenku-horizontal.png" alt="Asistenku" height="24" className="h-6" />
          <button 
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-transparent hover:bg-[#2d9cdb]/20 text-[#e8dcc4] h-9 px-3 opacity-50 cursor-not-allowed" 
            disabled
          >
            Logout (Disabled)
          </button>
        </div>
      </header>

      <main className="max-w-[720px] mx-auto px-6 py-12">
        {/* Greeting */}
        <div className="mb-12">
          <h1 className="text-3xl font-serif text-[#e8dcc4] mb-2">Selamat datang kembali</h1>
          <p className="text-[#d4c5a9] text-base">Ruang kendali pendampinganmu</p>
        </div>

        {/* Status Narrative */}
        <div className="mb-12 space-y-4">
          {/* Review */}
          <button
            onClick={() => setActiveBucket(activeBucket === 'review' ? null : 'review')}
            className={`w-full text-left transition-all ${
              reviewCount > 0 ? 'opacity-100' : 'opacity-50'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="w-0.5 h-12 bg-gradient-to-b from-[#d4af37] to-[#d4af37]/30 rounded-full" />
              <div className="flex-1 pt-2">
                <p className={`text-lg ${reviewCount > 0 ? 'text-[#d4af37]' : 'text-[#d4c5a9]'}`}>
                  ✨ {reviewCount > 0 ? `${reviewCount} hasil siap kamu tinjau` : 'Belum ada hasil untuk ditinjau'}
                </p>
              </div>
            </div>
          </button>

          {/* On Progress */}
          <button
            onClick={() => setActiveBucket(activeBucket === 'onProgress' ? null : 'onProgress')}
            className={`w-full text-left transition-all ${
              onProgressCount > 0 ? 'opacity-100' : 'opacity-50'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="w-0.5 h-12 bg-gradient-to-b from-[#2d9cdb] to-[#2d9cdb]/30 rounded-full" />
              <div className="flex-1 pt-2">
                <p className={`text-lg ${onProgressCount > 0 ? 'text-[#e8dcc4]' : 'text-[#d4c5a9]'}`}>
                  {onProgressCount > 0 ? `${onProgressCount} task sedang diproses Tim Asistenku` : 'Belum ada task dalam proses'}
                </p>
              </div>
            </div>
          </button>

          {/* Delegation */}
          <button
            onClick={() => setActiveBucket(activeBucket === 'delegation' ? null : 'delegation')}
            className={`w-full text-left transition-all ${
              delegationCount > 0 ? 'opacity-100' : 'opacity-50'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="w-0.5 h-12 bg-gradient-to-b from-[#d4c5a9] to-[#d4c5a9]/30 rounded-full" />
              <div className="flex-1 pt-2">
                <p className={`text-lg ${delegationCount > 0 ? 'text-[#e8dcc4]' : 'text-[#d4c5a9]'}`}>
                  {delegationCount > 0 ? `${delegationCount} permintaan sedang dalam proses delegasi` : 'Belum ada permintaan dalam delegasi'}
                </p>
              </div>
            </div>
          </button>

          {/* Done (collapsible) */}
          <button
            onClick={() => setActiveBucket(activeBucket === 'done' ? null : 'done')}
            className={`w-full text-left transition-all ${
              doneCount > 0 ? 'opacity-100' : 'opacity-50'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="w-0.5 h-12 bg-gradient-to-b from-[#5a9c7d] to-[#5a9c7d]/30 rounded-full" />
              <div className="flex-1 pt-2">
                <p className={`text-lg ${doneCount > 0 ? 'text-[#e8dcc4]' : 'text-[#d4c5a9]'}`}>
                  {doneCount > 0 ? `${doneCount} permintaan telah selesai bulan ini` : 'Belum ada permintaan selesai'}
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Task List */}
        {activeBucket && activeTasks.length > 0 && (
          <div className="mb-12 space-y-4">
            <h2 className="text-xl font-serif text-[#e8dcc4] mb-6">
              {activeBucket === 'review' && 'Review'}
              {activeBucket === 'onProgress' && 'On Progress'}
              {activeBucket === 'delegation' && 'Delegasi'}
              {activeBucket === 'done' && 'Selesai'}
            </h2>
            {activeTasks.map((task) => (
              <div
                key={task.taskId}
                className="rounded-2xl bg-[#f5f1e8]/95 border border-[#d4c5a9]/30 p-6 space-y-3"
              >
                <h3 className="text-lg font-medium text-[#0f2942]">{task.title}</h3>
                <p className="text-sm text-[#5a6c7d]">{task.detail}</p>
                
                {/* Delegation message */}
                {(task.phase === '#permintaan_baru' || task.phase === '#ditolak_partner') && (
                  <p className="text-sm italic text-[#5a6c7d]">{getDelegationMessage(task)}</p>
                )}

                <div className="flex items-center justify-between pt-2">
                  <div className="space-y-1">
                    <p className="text-xs text-[#5a6c7d]">{getPhaseLabel(task.phase)}</p>
                    <p className="text-xs text-[#5a6c7d]/70">{formatDate(task.updatedAt)}</p>
                  </div>
                  
                  <div className="flex gap-2">
                    {task.phase === '#review_client' && (
                      <button className="inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors h-9 px-4 bg-[#2d9cdb] text-white hover:bg-[#2589c4]">
                        Review
                      </button>
                    )}
                    
                    {task.phase === '#revisi' && (
                      <span className="inline-flex items-center justify-center rounded-lg text-sm font-medium h-9 px-4 bg-[#d4c5a9]/30 text-[#5a6c7d]">
                        Sedang disempurnakan
                      </span>
                    )}
                    
                    {shouldShowCancel(task) && (
                      <button className="inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors h-9 px-4 bg-transparent border border-[#d4c5a9] text-[#5a6c7d] hover:bg-[#d4c5a9]/20">
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeBucket && activeTasks.length === 0 && (
          <div className="mb-12 text-center py-8">
            <p className="text-[#d4c5a9] text-base">Tidak ada task di kategori ini</p>
          </div>
        )}

        {/* History (Riwayat) - Collapsible */}
        {getCanceledTasks().length > 0 && (
          <div className="mb-12">
            <button
              onClick={() => setHistoryExpanded(!historyExpanded)}
              className="w-full text-left mb-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-serif text-[#e8dcc4]">Riwayat</h2>
                <span className="text-[#d4c5a9]">{historyExpanded ? '−' : '+'}</span>
              </div>
            </button>
            
            {historyExpanded && (
              <div className="space-y-4">
                {getCanceledTasks().map((task) => (
                  <div
                    key={task.taskId}
                    className="rounded-2xl bg-[#f5f1e8]/60 border border-[#d4c5a9]/20 p-6 space-y-3 opacity-70"
                  >
                    <h3 className="text-lg font-medium text-[#0f2942]">{task.title}</h3>
                    <p className="text-sm text-[#5a6c7d]">{task.detail}</p>
                    <div className="flex items-center justify-between pt-2">
                      <div className="space-y-1">
                        <p className="text-xs text-[#5a6c7d]">{getPhaseLabel(task.phase)}</p>
                        <p className="text-xs text-[#5a6c7d]/70">{formatDate(task.updatedAt)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="text-center text-xs text-[#e8dcc4]/80 py-8">
        Asistenku © 2026 PT. Asistenku Digital Indonesia
      </footer>
    </div>
  );
}
