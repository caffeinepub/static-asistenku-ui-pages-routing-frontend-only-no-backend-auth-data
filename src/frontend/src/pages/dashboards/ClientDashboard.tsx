import { useCanCreateTaskUI } from '../../hooks/useQueries';

export default function ClientDashboard() {
  const { data: canCreateTask, isLoading } = useCanCreateTaskUI();

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

      <main className="max-w-4xl mx-auto px-6 py-16">
        <div className="rounded-3xl shadow-xl border border-[#d4c5a9]/30 p-16 text-center bg-[#f5f1e8]">
          <h1 className="text-2xl font-medium text-[#0f2942] mb-8">Ruang kendali kamu.</h1>
          
          <button
            disabled={isLoading || !canCreateTask}
            className={`inline-flex items-center justify-center rounded-xl text-sm font-medium transition-colors h-10 px-6 shadow-md ${
              isLoading || !canCreateTask
                ? 'bg-[#d4c5a9]/50 text-[#5a6c7d] opacity-50 cursor-not-allowed'
                : 'bg-[#2d9cdb] text-white hover:bg-[#2589c4]'
            }`}
          >
            {isLoading ? 'Memuat...' : 'Buat Task'}
          </button>
        </div>
      </main>

      <footer className="text-center text-xs text-[#e8dcc4]/80 py-8">
        Asistenku © 2026 PT. Asistenku Digital Indonesia
      </footer>
    </div>
  );
}
