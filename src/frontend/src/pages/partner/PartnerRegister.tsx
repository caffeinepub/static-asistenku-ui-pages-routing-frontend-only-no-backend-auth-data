export default function PartnerRegister() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6 pt-12">
      <div className="w-full max-w-[760px] space-y-8">
        <div className="flex justify-center mb-12">
          <img src="asistenku-horizontal.png" alt="Asistenku" height="32" className="h-8" />
        </div>

        <div className="rounded-3xl shadow-lg border border-border/50 p-10 space-y-8 bg-white">
          <div className="text-center space-y-3">
            <h1 className="text-3xl font-semibold text-foreground">Daftar</h1>
            <p className="text-muted-foreground text-lg">Untuk Partner Asistenku</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="nama" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Nama
              </label>
              <input 
                id="nama" 
                placeholder="Nama lengkap" 
                className="flex h-12 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Email
              </label>
              <input 
                id="email" 
                type="email" 
                placeholder="email@example.com" 
                className="flex h-12 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="whatsapp" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                WhatsApp
              </label>
              <input 
                id="whatsapp" 
                placeholder="+62..." 
                className="flex h-12 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="keahlian" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Keahlian
              </label>
              <textarea 
                id="keahlian" 
                placeholder="Deskripsikan keahlian Anda..." 
                className="flex min-h-[120px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="domisili" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Domisili
              </label>
              <input 
                id="domisili" 
                placeholder="Kota/Kabupaten" 
                className="flex h-12 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
              />
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <button 
              className="w-full inline-flex items-center justify-center rounded-2xl text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring bg-primary text-primary-foreground h-14 px-8 opacity-50 cursor-not-allowed" 
              disabled
            >
              Kirim (Disabled)
            </button>
            <a href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors block text-center">
              Kembali
            </a>
          </div>
        </div>

        <footer className="text-center text-xs text-muted-foreground pt-8">
          © {new Date().getFullYear()} • Built with love using{' '}
          <a
            href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            caffeine.ai
          </a>
        </footer>
      </div>
    </div>
  );
}
