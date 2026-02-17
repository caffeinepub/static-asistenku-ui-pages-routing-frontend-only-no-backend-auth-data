import { useState } from 'react';
import PageShell from '../_shared/PageShell';
import { useInternetIdentity } from '../../hooks/useInternetIdentity';
import { useActor } from '../../hooks/useActor';
import type { ClientProfile, UserRole } from '../../backend';

export default function ClientRegister() {
  const { login } = useInternetIdentity();
  const { actor } = useActor();

  const [isLoggedInII, setIsLoggedInII] = useState(false);
  const [isLoadingII, setIsLoadingII] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(false);

  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [perusahaan, setPerusahaan] = useState('');

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

  const isFormValid = () => {
    return (
      nama.trim().length >= 2 &&
      email.includes('@') &&
      whatsapp.trim().length >= 9 &&
      perusahaan.trim().length > 0
    );
  };

  const handleSubmit = async () => {
    if (isSubmitting || !isLoggedInII || !isFormValid()) return;
    if (!actor) {
      setError('Sistem belum siap, silakan coba lagi');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const profile: ClientProfile = {
        name: nama.trim(),
        email: email.trim(),
        whatsapp: whatsapp.trim(),
        company: perusahaan.trim(),
      };

      await actor.registerClient(profile);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Pendaftaran gagal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWorkspaceEntry = async () => {
    if (isLoadingWorkspace) return;
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

  if (success) {
    return (
      <PageShell>
        <div className="flex justify-center mb-12">
          <img src="/assets/asistenku-horizontal.png" alt="Asistenku" height="32" className="h-8" />
        </div>

        <div className="rounded-3xl shadow-xl border border-[#d4c5a9]/30 p-10 space-y-8 bg-[#f5f1e8]">
          <div className="text-center space-y-3">
            <div className="text-5xl mb-4">✓</div>
            <h1 className="text-3xl font-semibold text-[#0f2942]">Pendaftaran berhasil</h1>
            <p className="text-[#5a6c7d] text-lg">Selamat datang di Asistenku!</p>
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

          <button
            type="button"
            onClick={handleWorkspaceEntry}
            disabled={isLoadingWorkspace}
            className={`w-full inline-flex items-center justify-center rounded-2xl text-base font-medium transition-colors h-14 px-8 shadow-md ${
              isLoadingWorkspace
                ? 'bg-[#2d9cdb]/50 text-white cursor-not-allowed'
                : 'bg-[#2d9cdb] text-white hover:bg-[#2d9cdb]/90'
            }`}
          >
            {isLoadingWorkspace ? 'Loading...' : 'Masuk ke ruang kerja'}
          </button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="flex justify-center mb-12">
        <img src="/assets/asistenku-horizontal.png" alt="Asistenku" height="32" className="h-8" />
      </div>

      <div className="rounded-3xl shadow-xl border border-[#d4c5a9]/30 p-10 space-y-8 bg-[#f5f1e8]">
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-semibold text-[#0f2942]">Daftar Client</h1>
          <p className="text-[#5a6c7d] text-lg">Isi data Anda.</p>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {!isLoggedInII && (
          <button
            type="button"
            onClick={handleIILogin}
            disabled={isLoadingII}
            className={`w-full inline-flex items-center justify-center rounded-2xl text-base font-medium transition-colors h-14 px-8 shadow-md ${
              isLoadingII
                ? 'bg-[#2d9cdb]/50 text-white cursor-not-allowed'
                : 'bg-[#2d9cdb] text-white hover:bg-[#2d9cdb]/90'
            }`}
          >
            {isLoadingII ? 'Logging in...' : 'Login Internet Identity'}
          </button>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#0f2942] mb-2">Nama</label>
            <input
              type="text"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[#d4c5a9] bg-white text-[#0f2942] placeholder:text-[#5a6c7d]/50 focus:outline-none focus:ring-2 focus:ring-[#2d9cdb] transition-all"
              placeholder="Nama lengkap"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#0f2942] mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[#d4c5a9] bg-white text-[#0f2942] placeholder:text-[#5a6c7d]/50 focus:outline-none focus:ring-2 focus:ring-[#2d9cdb] transition-all"
              placeholder="email@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#0f2942] mb-2">WhatsApp</label>
            <input
              type="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[#d4c5a9] bg-white text-[#0f2942] placeholder:text-[#5a6c7d]/50 focus:outline-none focus:ring-2 focus:ring-[#2d9cdb] transition-all"
              placeholder="+62..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#0f2942] mb-2">Perusahaan</label>
            <input
              type="text"
              value={perusahaan}
              onChange={(e) => setPerusahaan(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[#d4c5a9] bg-white text-[#0f2942] placeholder:text-[#5a6c7d]/50 focus:outline-none focus:ring-2 focus:ring-[#2d9cdb] transition-all"
              placeholder="Nama perusahaan"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!isLoggedInII || !isFormValid() || isSubmitting}
          className={`w-full inline-flex items-center justify-center rounded-2xl text-base font-medium transition-colors h-14 px-8 shadow-md ${
            !isLoggedInII || !isFormValid() || isSubmitting
              ? 'bg-[#2d9cdb]/50 text-white cursor-not-allowed'
              : 'bg-[#2d9cdb] text-white hover:bg-[#2d9cdb]/90'
          }`}
        >
          {isSubmitting ? 'Mendaftar...' : 'Daftar'}
        </button>

        <div className="text-center pt-4">
          <a href="/external/client/login" className="text-sm text-[#5a6c7d] hover:text-[#0f2942] transition-colors">
            Kembali
          </a>
        </div>
      </div>
    </PageShell>
  );
}
