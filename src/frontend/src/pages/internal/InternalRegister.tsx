import PageShell from '../_shared/PageShell';

export default function InternalRegister() {
  return (
    <PageShell>
      <div className="flex justify-center mb-12">
        <img src="asistenku-horizontal.png" alt="Asistenku" height="32" className="h-8" />
      </div>

      <div className="rounded-3xl shadow-xl border border-[#d4c5a9]/30 p-10 space-y-8 bg-[#f5f1e8]">
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-semibold text-[#0f2942]">Daftar Internal</h1>
          <p className="text-[#5a6c7d] text-lg">Isi data Anda.</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#0f2942] mb-2">Nama</label>
            <input 
              type="text" 
              className="w-full px-4 py-3 rounded-xl border border-[#d4c5a9] bg-white text-[#0f2942] placeholder:text-[#5a6c7d]/50 focus:outline-none focus:ring-2 focus:ring-[#2d9cdb] transition-all"
              placeholder="Nama lengkap"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#0f2942] mb-2">Email</label>
            <input 
              type="email" 
              className="w-full px-4 py-3 rounded-xl border border-[#d4c5a9] bg-white text-[#0f2942] placeholder:text-[#5a6c7d]/50 focus:outline-none focus:ring-2 focus:ring-[#2d9cdb] transition-all"
              placeholder="email@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#0f2942] mb-2">WhatsApp</label>
            <input 
              type="tel" 
              className="w-full px-4 py-3 rounded-xl border border-[#d4c5a9] bg-white text-[#0f2942] placeholder:text-[#5a6c7d]/50 focus:outline-none focus:ring-2 focus:ring-[#2d9cdb] transition-all"
              placeholder="+62..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#0f2942] mb-2">Role</label>
            <select 
              className="w-full px-4 py-3 rounded-xl border border-[#d4c5a9] bg-white text-[#0f2942] focus:outline-none focus:ring-2 focus:ring-[#2d9cdb] transition-all"
            >
              <option value="">Pilih role</option>
              <option value="admin">Admin</option>
              <option value="finance">Finance</option>
              <option value="concierge">Concierge</option>
              <option value="asistenmu">Asistenmu</option>
            </select>
          </div>
        </div>

        <button 
          className="w-full inline-flex items-center justify-center rounded-2xl text-base font-medium transition-colors bg-[#2d9cdb] text-white h-14 px-8 opacity-50 cursor-not-allowed shadow-md" 
          disabled
        >
          Daftar (Disabled)
        </button>

        <div className="text-center pt-4">
          <a href="/internal/login" className="text-sm text-[#5a6c7d] hover:text-[#0f2942] transition-colors">
            Kembali
          </a>
        </div>
      </div>
    </PageShell>
  );
}
