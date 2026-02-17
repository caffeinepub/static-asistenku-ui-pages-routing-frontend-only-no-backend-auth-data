import PageShell from './_shared/PageShell';

export default function Landing() {
  return (
    <PageShell>
      <div className="flex justify-center mb-12">
        <img src="/assets/asistenku-horizontal.png" alt="Asistenku" height="32" className="h-8" />
      </div>

      <div className="rounded-3xl shadow-xl border border-[#d4c5a9]/30 p-10 space-y-8 bg-[#f5f1e8]">
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-semibold text-[#0f2942]">Ruang Masuk</h1>
          <p className="text-[#5a6c7d] text-lg">Pilih akses yang sesuai.</p>
        </div>

        <div className="space-y-4">
          <a href="/external/client/login" className="block">
            <button className="w-full inline-flex items-center justify-center rounded-2xl text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d9cdb] bg-[#2d9cdb] text-white hover:bg-[#2589c4] h-14 px-8 shadow-md">
              Client Login
            </button>
          </a>
          <a href="/external/partner/login" className="block">
            <button className="w-full inline-flex items-center justify-center rounded-2xl text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d9cdb] bg-[#2d9cdb] text-white hover:bg-[#2589c4] h-14 px-8 shadow-md">
              Partner Login
            </button>
          </a>
        </div>

        <div className="text-center space-y-3 pt-4">
          <p className="text-sm text-[#5a6c7d]">Belum punya akun?</p>
          <div className="flex justify-center gap-4">
            <a href="/external/client/register" className="text-sm text-[#2d9cdb] hover:underline font-medium">
              Daftar Client
            </a>
            <span className="text-[#5a6c7d]">•</span>
            <a href="/external/partner/register" className="text-sm text-[#2d9cdb] hover:underline font-medium">
              Daftar Partner
            </a>
          </div>
        </div>

        <div className="text-center pt-6 border-t border-[#d4c5a9]/50">
          <a href="/internal" className="text-xs text-[#5a6c7d] hover:text-[#0f2942] transition-colors">
            Internal
          </a>
        </div>
      </div>
    </PageShell>
  );
}
