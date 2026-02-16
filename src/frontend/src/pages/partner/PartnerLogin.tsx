import PageShell from '../_shared/PageShell';

export default function PartnerLogin() {
  return (
    <PageShell>
      <div className="flex justify-center mb-12">
        <img src="asistenku-horizontal.png" alt="Asistenku" height="32" className="h-8" />
      </div>

      <div className="rounded-3xl shadow-xl border border-[#d4c5a9]/30 p-10 space-y-8 bg-[#f5f1e8]">
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-semibold text-[#0f2942]">Masuk</h1>
          <p className="text-[#5a6c7d] text-lg">Untuk Partner Asistenku</p>
        </div>

        <div className="space-y-4">
          <button 
            className="w-full inline-flex items-center justify-center rounded-2xl text-base font-medium transition-colors bg-[#2d9cdb] text-white h-14 px-8 opacity-50 cursor-not-allowed shadow-md" 
            disabled
          >
            Login Internet Identity (Disabled)
          </button>
          <button 
            className="w-full inline-flex items-center justify-center rounded-2xl text-base font-medium transition-colors bg-[#d4c5a9] text-[#0f2942] h-14 px-8 opacity-50 cursor-not-allowed shadow-md" 
            disabled
          >
            Masuk ke ruang kerja (Disabled)
          </button>
        </div>

        <div className="text-center space-y-4 pt-4">
          <a href="/partner/register" className="text-sm text-[#2d9cdb] hover:underline block font-medium">
            Belum punya akun? Daftar
          </a>
          <a href="/" className="text-sm text-[#5a6c7d] hover:text-[#0f2942] transition-colors block">
            Kembali
          </a>
        </div>
      </div>
    </PageShell>
  );
}
