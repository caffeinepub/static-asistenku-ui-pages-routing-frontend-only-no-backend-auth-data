import PageShell from '../_shared/PageShell';

export default function InternalLanding() {
  return (
    <PageShell>
      <div className="flex justify-center mb-12">
        <img src="asistenku-horizontal.png" alt="Asistenku" height="32" className="h-8" />
      </div>

      <div className="rounded-3xl shadow-xl border border-[#d4c5a9]/30 p-10 space-y-8 bg-[#f5f1e8]">
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-semibold text-[#0f2942]">Internal</h1>
          <p className="text-[#5a6c7d] text-lg">Akses internal Asistenku.</p>
        </div>

        <div className="space-y-4">
          <a href="/internal/login" className="block">
            <button className="w-full inline-flex items-center justify-center rounded-2xl text-base font-medium transition-colors bg-[#2d9cdb] text-white hover:bg-[#2589c4] h-14 px-8 shadow-md">
              Internal Login
            </button>
          </a>
          <a href="/internal/register" className="block">
            <button className="w-full inline-flex items-center justify-center rounded-2xl text-base font-medium transition-colors bg-[#d4c5a9] text-[#0f2942] hover:bg-[#c9b896] h-14 px-8 shadow-md">
              Internal Register
            </button>
          </a>
        </div>

        <div className="text-center pt-6">
          <a href="/" className="text-sm text-[#5a6c7d] hover:text-[#0f2942] transition-colors">
            Kembali
          </a>
        </div>
      </div>
    </PageShell>
  );
}
