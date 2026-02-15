import { useState } from 'react';

const roles = ['Superadmin', 'Admin', 'Finance', 'Concierge', 'Asistenmu'];

export default function InternalLogin() {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6 pt-12">
      <div className="w-full max-w-[760px] space-y-8">
        <div className="flex justify-center mb-12">
          <img src="asistenku-horizontal.png" alt="Asistenku" height="32" className="h-8" />
        </div>

        <div className="rounded-3xl shadow-lg border border-border/50 p-10 space-y-8 bg-white">
          <div className="text-center space-y-3">
            <h1 className="text-3xl font-semibold text-foreground">Internal Login</h1>
            <p className="text-muted-foreground text-lg">Pilih role internal (statis dulu).</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {roles.map((role) => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`p-6 rounded-2xl border-2 transition-all ${
                  selectedRole === role
                    ? 'border-primary bg-primary/5 shadow-md'
                    : 'border-border hover:border-primary/50 hover:bg-muted/30'
                }`}
              >
                <span className="text-base font-medium">{role}</span>
              </button>
            ))}
          </div>

          <div className="space-y-4 pt-4">
            <button 
              className="w-full inline-flex items-center justify-center rounded-2xl text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring bg-primary text-primary-foreground h-14 px-8 opacity-50 cursor-not-allowed" 
              disabled
            >
              Login Internet Identity (Disabled)
            </button>
            <button 
              className="w-full inline-flex items-center justify-center rounded-2xl text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring bg-secondary text-secondary-foreground hover:bg-secondary/80 h-14 px-8 opacity-50 cursor-not-allowed" 
              disabled
            >
              Ruang kerja (Disabled)
            </button>
          </div>

          <div className="text-center pt-4">
            <a href="/internal" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
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
