export default function InternalLanding() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6 pt-12">
      <div className="w-full max-w-[760px] space-y-8">
        <div className="flex justify-center mb-12">
          <img src="asistenku-horizontal.png" alt="Asistenku" height="32" className="h-8" />
        </div>

        <div className="rounded-3xl shadow-lg border border-border/50 p-10 space-y-8 bg-white">
          <div className="text-center space-y-3">
            <h1 className="text-3xl font-semibold text-foreground">Internal</h1>
            <p className="text-muted-foreground text-lg">Akses internal Asistenku.</p>
          </div>

          <div className="space-y-4">
            <a href="/internal/login" className="block">
              <button className="w-full inline-flex items-center justify-center rounded-2xl text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring bg-primary text-primary-foreground hover:bg-primary/90 h-14 px-8">
                Internal Login
              </button>
            </a>
            <a href="/internal/register" className="block">
              <button className="w-full inline-flex items-center justify-center rounded-2xl text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring bg-secondary text-secondary-foreground hover:bg-secondary/80 h-14 px-8">
                Internal Register
              </button>
            </a>
          </div>

          <div className="text-center pt-6">
            <a href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
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
