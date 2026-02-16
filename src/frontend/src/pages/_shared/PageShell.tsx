import { ReactNode } from 'react';

interface PageShellProps {
  children: ReactNode;
}

export default function PageShell({ children }: PageShellProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f2942] via-[#1a3a52] to-[#e8dcc4] flex items-center justify-center p-6 pt-12">
      <div className="w-full max-w-[760px] space-y-8">
        {children}
        
        <footer className="text-center text-xs text-[#e8dcc4]/80 pt-8">
          Asistenku © 2026 PT. Asistenku Digital Indonesia
        </footer>
      </div>
    </div>
  );
}
