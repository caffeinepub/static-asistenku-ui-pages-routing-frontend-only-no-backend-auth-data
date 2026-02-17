import { useState } from 'react';
import PageShell from '../_shared/PageShell';
import { useInternetIdentity } from '../../hooks/useInternetIdentity';
import { useActor } from '../../hooks/useActor';
import type { UserRole } from '../../backend';

export default function ClientLogin() {
  const { login, identity } = useInternetIdentity();
  const { actor } = useActor();

  const [isLoggedInII, setIsLoggedInII] = useState(false);
  const [isLoadingII, setIsLoadingII] = useState(false);
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleIILogin = async () => {
    if (isLoadingII) return;
    
    setIsLoadingII(true);
    setError(null);
    
    try {
      await login();
      setIsLoggedInII(true);
    } catch (err: any) {
      setError(err.message || 'Login gagal');
    } finally {
      setIsLoadingII(false);
    }
  };

  const handleWorkspaceEntry = async () => {
    if (isLoadingWorkspace || !isLoggedInII) return;
    if (!actor) {
      setError('Sistem belum siap, silakan coba lagi');
      return;
    }

    setIsLoadingWorkspace(true);
    setError(null);

    try {
      const user: UserRole | null = await actor.getCallerUser();

      if (!user) {
        window.location.href = '/external/client/register';
        return;
      }

      if (user.__kind__ !== 'client') {
        setError('Silahkan klik sesuai dengan akun anda');
        setIsLoadingWorkspace(false);
        return;
      }

      // User status check not yet implemented in backend
      // Proceed directly to dashboard for now
      window.location.href = '/client/dashboard';
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan');
      setIsLoadingWorkspace(false);
    }
  };

  const handleBackToLogin = () => {
    window.location.href = '/external/client/login';
  };

  return (
    <PageShell>
      <div className="flex justify-center mb-12">
        <img src="/assets/asistenku-horizontal.png" alt="Asistenku" height="32" className="h-8" />
      </div>

      <div className="rounded-3xl shadow-xl border border-[#d4c5a9]/30 p-10 space-y-8 bg-[#f5f1e8]">
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-semibold text-[#0f2942]">Masuk</h1>
          <p className="text-[#5a6c7d] text-lg">Untuk Client Asistenku</p>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-800">
            {error}
            {error === 'Silahkan klik sesuai dengan akun anda' && (
              <button
                type="button"
                onClick={handleBackToLogin}
                className="mt-2 text-red-600 hover:text-red-800 underline block"
              >
                Kembali
              </button>
            )}
          </div>
        )}

        <div className="space-y-4">
          <button
            type="button"
            onClick={handleIILogin}
            disabled={isLoadingII || isLoggedInII}
            className={`w-full inline-flex items-center justify-center rounded-2xl text-base font-medium transition-colors h-14 px-8 shadow-md ${
              isLoadingII || isLoggedInII
                ? 'bg-[#2d9cdb]/50 text-white cursor-not-allowed'
                : 'bg-[#2d9cdb] text-white hover:bg-[#2d9cdb]/90'
            }`}
          >
            {isLoadingII ? 'Logging in...' : isLoggedInII ? 'Logged in' : 'Login Internet Identity'}
          </button>
          <button
            type="button"
            onClick={handleWorkspaceEntry}
            disabled={!isLoggedInII || isLoadingWorkspace}
            className={`w-full inline-flex items-center justify-center rounded-2xl text-base font-medium transition-colors h-14 px-8 shadow-md ${
              !isLoggedInII || isLoadingWorkspace
                ? 'bg-[#d4c5a9]/50 text-[#0f2942]/50 cursor-not-allowed'
                : 'bg-[#d4c5a9] text-[#0f2942] hover:bg-[#d4c5a9]/90'
            }`}
          >
            {isLoadingWorkspace ? 'Loading...' : 'Masuk ke ruang kerja'}
          </button>
        </div>

        <div className="text-center space-y-4 pt-4">
          <a href="/external/client/register" className="text-sm text-[#2d9cdb] hover:underline block font-medium">
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
