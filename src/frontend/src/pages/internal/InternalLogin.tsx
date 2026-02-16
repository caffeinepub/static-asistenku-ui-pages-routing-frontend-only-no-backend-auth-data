import { useState, useEffect, useRef } from 'react';
import { useInternetIdentity } from '../../hooks/useInternetIdentity';
import { useActor } from '../../hooks/useActor';
import type { UserRole } from '../../backend';
import PageShell from '../_shared/PageShell';

const REQUIRED_ROLES = [
  'admin',
  'finance',
  'concierge',
  'asistenmu',
  'superadmin'
] as const;

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  finance: 'Finance',
  concierge: 'Concierge',
  asistenmu: 'Asistenmu',
  superadmin: 'Superadmin'
};

const ROLE_DASHBOARD_MAP: Record<string, string> = {
  admin: '/admin/dashboard',
  finance: '/finance/dashboard',
  concierge: '/concierge/dashboard',
  asistenmu: '/asistenmu/dashboard',
  superadmin: '/superadmin/dashboard'
};

function extractRoleKey(userRole: UserRole | null): string | null {
  if (!userRole) return null;
  
  if ('__kind__' in userRole) {
    const kind = userRole.__kind__;
    if (kind === 'superadmin') return 'superadmin';
    if (kind === 'client') return 'client';
    if (kind === 'partner') return 'partner';
    if (kind === 'internal' && 'internal' in userRole) {
      const profile = userRole.internal;
      if (profile && typeof profile === 'object' && 'role' in profile) {
        return String(profile.role);
      }
    }
  }
  
  return null;
}

function extractStatus(userRole: UserRole | null): string | null {
  if (!userRole) return null;
  
  if ('__kind__' in userRole) {
    const kind = userRole.__kind__;
    if (kind === 'internal' && 'internal' in userRole) {
      const profile = userRole.internal;
      if (profile && typeof profile === 'object' && 'status' in profile) {
        return String(profile.status);
      }
    }
  }
  
  return null;
}

function navigateToPath(path: string) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export default function InternalLogin() {
  const { login, clear, identity, loginStatus } = useInternetIdentity();
  const { actor, isFetching: actorFetching } = useActor();
  
  const [iiLoggedIn, setIiLoggedIn] = useState(false);
  const [checkingRole, setCheckingRole] = useState<string | null>(null);
  const [warningText, setWarningText] = useState<string | null>(null);
  const [superadminClaimed, setSuperadminClaimed] = useState<boolean>(false);
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimCheckDone, setClaimCheckDone] = useState(false);

  const claimCheckRef = useRef(false);

  useEffect(() => {
    if (identity && !identity.getPrincipal().isAnonymous()) {
      setIiLoggedIn(true);
    } else {
      setIiLoggedIn(false);
    }
  }, [identity]);

  // Improved claim check: runs as soon as actor is available and user is logged in
  useEffect(() => {
    // Only run if logged in, actor exists, not currently fetching, and haven't checked yet
    if (!iiLoggedIn || !actor || actorFetching || claimCheckRef.current) return;

    claimCheckRef.current = true;

    (async () => {
      try {
        const actorAny = actor as any;
        if (typeof actorAny.isSuperadminClaimed === 'function') {
          const claimed = await actorAny.isSuperadminClaimed();
          setSuperadminClaimed(!!claimed);
        }
      } catch (err) {
        console.error('Error checking superadmin claim status:', err);
      } finally {
        setClaimCheckDone(true);
      }
    })();
  }, [iiLoggedIn, actor, actorFetching]);

  const handleAuthClick = async () => {
    if (iiLoggedIn) {
      try {
        await clear();
        setCheckingRole(null);
        setWarningText(null);
        setClaimLoading(false);
        setSuperadminClaimed(false);
        setClaimCheckDone(false);
        claimCheckRef.current = false;
      } catch (err: any) {
        console.error('Logout error:', err);
        setWarningText(err?.message || 'Logout gagal');
      }
    } else {
      try {
        await login();
      } catch (err: any) {
        console.error('Login error:', err);
        setWarningText(err?.message || 'Login gagal');
      }
    }
  };

  const handleWorkspaceClick = async (role: string) => {
    if (!actor || actorFetching) {
      setWarningText('Backend belum siap, tunggu sebentar lalu coba lagi');
      return;
    }

    setCheckingRole(role);
    setWarningText(null);

    try {
      const user = await actor.getCallerUser();
      
      if (!user) {
        setWarningText('Akun belum terdaftar');
        setCheckingRole(null);
        return;
      }

      const userRoleKey = extractRoleKey(user);
      
      if (!userRoleKey) {
        setWarningText('Role tidak valid');
        setCheckingRole(null);
        return;
      }

      if (userRoleKey !== role) {
        setWarningText('Klik di Ruang kerja yang sesuai dengan bagian/role kamu');
        setCheckingRole(null);
        return;
      }

      if (role !== 'client' && role !== 'partner' && role !== 'superadmin') {
        const status = extractStatus(user);
        if (status !== 'active') {
          setWarningText('Menunggu persetujuan.');
          setCheckingRole(null);
          return;
        }
      }

      const dashboardPath = ROLE_DASHBOARD_MAP[role];
      if (dashboardPath) {
        navigateToPath(dashboardPath);
      } else {
        setWarningText('Dashboard tidak ditemukan untuk role ini');
      }
    } catch (err: any) {
      console.error('Error checking user:', err);
      setWarningText(err?.message || 'Terjadi kesalahan, coba lagi');
    } finally {
      setCheckingRole(null);
    }
  };

  const handleClaimSuperadmin = async () => {
    if (!actor || actorFetching) {
      setWarningText('Backend belum siap, tunggu sebentar lalu coba lagi');
      return;
    }

    setClaimLoading(true);
    setWarningText(null);

    try {
      // Only call claimSuperadmin, no other mutations
      await actor.claimSuperadmin();
      
      // On success: hide card permanently, no redirect
      setSuperadminClaimed(true);
    } catch (err: any) {
      console.error('Claim superadmin error:', err);
      
      // Perform exactly one follow-up check
      try {
        const actorAny = actor as any;
        if (typeof actorAny.isSuperadminClaimed === 'function') {
          const claimed = await actorAny.isSuperadminClaimed();
          
          if (claimed) {
            // Claim succeeded despite error, hide card without error message
            setSuperadminClaimed(true);
          } else {
            // True failure: show friendly error
            setWarningText('Gagal mengklaim superadmin. Silakan coba lagi.');
          }
        } else {
          // Cannot verify, show error
          setWarningText('Gagal mengklaim superadmin. Silakan coba lagi.');
        }
      } catch (checkErr) {
        console.error('Follow-up claim check error:', checkErr);
        // Follow-up check failed, show error
        setWarningText('Gagal mengklaim superadmin. Silakan coba lagi.');
      }
    } finally {
      setClaimLoading(false);
    }
  };

  const showClaimCard = iiLoggedIn && claimCheckDone && !superadminClaimed && !!actor && !actorFetching;

  return (
    <PageShell>
      <div className="flex justify-center mb-12">
        <img src="/assets/asistenku-horizontal.png" alt="Asistenku" height="32" className="h-8" />
      </div>

      <div className="rounded-3xl shadow-xl border border-[#d4c5a9]/30 p-10 space-y-8 bg-[#f5f1e8]">
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-semibold text-[#0f2942]">Internal Login</h1>
          <p className="text-[#5a6c7d] text-lg">Pilih role internal Anda.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {REQUIRED_ROLES.map((role) => (
            <div
              key={role}
              className={`rounded-2xl border-2 border-[#d4c5a9] bg-white p-6 shadow-md transition-all ${
                !iiLoggedIn ? 'opacity-50' : 'hover:shadow-lg hover:border-[#2d9cdb]'
              }`}
            >
              <div className="text-center space-y-4">
                <h3 className="text-lg font-semibold text-[#0f2942]">{ROLE_LABELS[role]}</h3>
                <button
                  onClick={() => handleWorkspaceClick(role)}
                  disabled={!iiLoggedIn || checkingRole === role}
                  className={`w-full inline-flex items-center justify-center rounded-xl text-sm font-medium transition-colors h-10 px-4 ${
                    !iiLoggedIn || checkingRole === role
                      ? 'bg-[#d4c5a9]/50 text-[#5a6c7d] cursor-not-allowed'
                      : 'bg-[#2d9cdb] text-white hover:bg-[#2589c4] shadow-md'
                  }`}
                >
                  {checkingRole === role ? 'Checking...' : 'Workspace'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {showClaimCard && (
          <div className="rounded-2xl border-2 border-[#2d9cdb] bg-[#2d9cdb]/10 p-6 space-y-4 shadow-md">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-[#0f2942]">Claim Superadmin</h3>
              <p className="text-sm text-[#5a6c7d]">
                Hanya satu superadmin yang dapat diklaim secara global.
              </p>
            </div>
            <button
              onClick={handleClaimSuperadmin}
              disabled={claimLoading}
              className={`w-full inline-flex items-center justify-center rounded-xl text-sm font-medium transition-colors h-11 px-6 ${
                claimLoading
                  ? 'bg-[#2d9cdb]/50 text-white cursor-not-allowed'
                  : 'bg-[#2d9cdb] text-white hover:bg-[#2589c4] shadow-md'
              }`}
            >
              {claimLoading ? 'Claiming...' : 'Claim Superadmin'}
            </button>
          </div>
        )}

        <div className="space-y-4 pt-4">
          <button 
            onClick={handleAuthClick}
            disabled={loginStatus === 'logging-in'}
            className={`w-full inline-flex items-center justify-center rounded-2xl text-base font-medium transition-colors h-14 px-8 shadow-md ${
              loginStatus === 'logging-in'
                ? 'bg-[#2d9cdb]/50 text-white cursor-not-allowed'
                : 'bg-[#2d9cdb] text-white hover:bg-[#2589c4]'
            }`}
          >
            {loginStatus === 'logging-in' ? 'Logging in...' : iiLoggedIn ? 'Logout' : 'Login Internet Identity'}
          </button>

          {warningText && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200">
              <p className="text-sm text-red-700 text-center">{warningText}</p>
              {warningText === 'Akun belum terdaftar' && (
                <div className="mt-3 text-center">
                  <a
                    href="/internal/register"
                    className="inline-flex items-center justify-center rounded-xl text-sm font-medium transition-colors bg-[#d4c5a9] text-[#0f2942] hover:bg-[#c9b896] h-9 px-4 shadow-md"
                  >
                    Ke pendaftaran
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="text-center pt-4">
          <a href="/internal" className="text-sm text-[#5a6c7d] hover:text-[#0f2942] transition-colors">
            Kembali
          </a>
        </div>
      </div>
    </PageShell>
  );
}
