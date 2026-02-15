export default function SuperadminDashboard() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-border/50 bg-white pt-4">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <img src="asistenku-horizontal.png" alt="Asistenku" height="24" className="h-6" />
          <button 
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring bg-transparent hover:bg-accent hover:text-accent-foreground h-9 px-3 text-muted-foreground opacity-50 cursor-not-allowed" 
            disabled
          >
            Logout (Disabled)
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <div className="rounded-3xl shadow-lg border border-border/50 p-16 text-center bg-white">
          <h1 className="text-2xl font-medium text-foreground">Asistenku dalam kendali penuh.</h1>
        </div>
      </main>
    </div>
  );
}
