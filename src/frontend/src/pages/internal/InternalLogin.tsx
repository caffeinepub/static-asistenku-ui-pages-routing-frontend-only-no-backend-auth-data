import { useState, useEffect, useRef } from 'react';
import { useInternetIdentity } from '../../hooks/useInternetIdentity';
import { useActor } from '../../hooks/useActor';
import type { UserRole } from '../../backend';

const REQUIRED_ROLES = [
  'admin',
  'asistenmu',
  'concierge',
  'strategicpartner',
  'manajer',
  'finance',
  'management'
] as const;

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  asistenmu: 'Asistenmu',
  concierge: 'Concierge',
  strategicpartner: 'Strategic Partner',
  manajer: 'Manajer',
  finance: 'Finance',
  management: 'Management'
};

const ROLE_DASHBOARD_MAP: Record<string, string> = {
  admin: '/admin/dashboard',
  asistenmu: '/asistenmu/dashboard',
  concierge: '/concierge/dashboard',
  strategicpartner: '/strategicpartner/dashboard',
  manajer: '/manajer/dashboard',
  finance: '/finance/dashboard',
  management: '/management/dashboard',
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
  
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [iiLoggedIn, setIiLoggedIn] = useState(false);
  const [checking, setChecking] = useState(false);
  const [warningText, setWarningText] = useState<string | null>(null);
  const [superadminClaimed, setSuperadminClaimed] = useState<boolean>(false);
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimCheckDone, setClaimCheckDone] = useState(false);

  const claimCheckRef = useRef(false);

  // Update iiLoggedIn when identity changes
  useEffect(() => {
    if (identity && !identity.getPrincipal().isAnonymous()) {
      setIiLoggedIn(true);
    } else {
      setIiLoggedIn(false);
    }
  }, [identity]);

  // Check if superadmin is already claimed (once on mount when actor is ready)
  useEffect(() => {
    if (!actor || actorFetching || claimCheckRef.current) return;

    claimCheckRef.current = true;

    (async () => {
      try {
        // Type-safe call: backend has isSuperadminClaimed() but it's not in the interface
        // We'll call it via a safe cast
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
  }, [actor, actorFetching]);

  const handleAuthClick = async () => {
    if (iiLoggedIn) {
      // Logout
      try {
        await clear();
        // Reset local state to safe defaults
        setSelectedRole(null);
        setWarningText(null);
        setChecking(false);
        setClaimLoading(false);
        setSuperadminClaimed(false);
        setClaimCheckDone(false);
        claimCheckRef.current = false;
      } catch (err: any) {
        console.error('Logout error:', err);
        setWarningText(err?.message || 'Logout gagal');
      }
    } else {
      // Login
      try {
        await login();
      } catch (err: any) {
        console.error('Login error:', err);
        setWarningText(err?.message || 'Login gagal');
      }
    }
  };

  const handleRoleCardClick = (role: string) => {
    setSelectedRole(role);
    setWarningText(null);
  };

  const handleRuangKerjaClick = async () => {
    if (!actor || actorFetching) {
      setWarningText('Backend belum siap, tunggu sebentar lalu coba lagi');
      return;
    }

    setChecking(true);
    setWarningText(null);

    try {
      const user = await actor.getCallerUser();
      
      // User is null
      if (!user) {
        setWarningText('Akun belum terdaftar');
        setChecking(false);
        return;
      }

      // User exists, extract role
      const userRoleKey = extractRoleKey(user);
      
      if (!userRoleKey) {
        setWarningText('Role tidak valid');
        setChecking(false);
        return;
      }

      // Check role match
      if (userRoleKey !== selectedRole) {
        setWarningText('Klik di Ruang kerja yang sesuai dengan bagian/role kamu');
        setChecking(false);
        return;
      }

      // Check status for internal roles (not client/partner/superadmin)
      if (selectedRole !== 'client' && selectedRole !== 'partner' && selectedRole !== 'superadmin') {
        const status = extractStatus(user);
        if (status !== 'active') {
          setWarningText('Menunggu persetujuan.');
          setChecking(false);
          return;
        }
      }

      // All checks passed, navigate
      const dashboardPath = ROLE_DASHBOARD_MAP[selectedRole];
      if (dashboardPath) {
        navigateToPath(dashboardPath);
      } else {
        setWarningText('Dashboard tidak ditemukan untuk role ini');
      }
    } catch (err: any) {
      console.error('Error checking user:', err);
      setWarningText(err?.message || 'Terjadi kesalahan, coba lagi');
    } finally {
      setChecking(false);
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
      // ONLY call claimSuperadmin, no other backend mutations
      await actor.claimSuperadmin();
      
      // Success
      setSuperadminClaimed(true);
      navigateToPath('/superadmin/dashboard');
    } catch (err: any) {
      console.error('Claim superadmin error:', err);
      const errMsg = err?.message || String(err);
      
      if (errMsg.includes('already') || errMsg.includes('claimed') || errMsg.includes('allowed')) {
        setSuperadminClaimed(true);
        setWarningText('Superadmin sudah diklaim.');
      } else {
        setWarningText(errMsg);
      }
    } finally {
      setClaimLoading(false);
    }
  };

  const isRuangKerjaEnabled = iiLoggedIn && selectedRole !== null;
  // Gate Claim Superadmin card: only show when actor is ready AND logged in AND check done AND not claimed
  const showClaimCard = iiLoggedIn && claimCheckDone && !superadminClaimed && !!actor && !actorFetching;

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6 pt-12">
      <div className="w-full max-w-[760px] space-y-8">
        <div className="flex justify-center mb-12">
          <img src="/assets/asistenku-horizontal.png" alt="Asistenku" height="32" className="h-8" />
        </div>

        <div className="rounded-3xl shadow-lg border border-border/50 p-10 space-y-8 bg-white">
          <div className="text-center space-y-3">
            <h1 className="text-3xl font-semibold text-foreground">Internal Login</h1>
            <p className="text-muted-foreground text-lg">Pilih role internal Anda.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {REQUIRED_ROLES.map((role) => (
              <button
                key={role}
                onClick={() => handleRoleCardClick(role)}
                disabled={!iiLoggedIn}
                className={`w-full p-6 rounded-2xl border-2 transition-all ${
                  selectedRole === role
                    ? 'border-primary bg-primary/5 shadow-md'
                    : 'border-border hover:border-primary/50 hover:bg-muted/30'
                } ${!iiLoggedIn ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span className="text-base font-medium">{ROLE_LABELS[role]}</span>
              </button>
            ))}
          </div>

          {showClaimCard && (
            <div className="rounded-2xl border-2 border-primary bg-primary/5 p-6 space-y-4">
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold text-foreground">Claim Superadmin</h3>
                <p className="text-sm text-muted-foreground">
                  Hanya satu superadmin yang dapat diklaim secara global.
                </p>
              </div>
              <button
                onClick={handleClaimSuperadmin}
                disabled={claimLoading}
                className="w-full inline-flex items-center justify-center rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-6 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {claimLoading ? 'Claiming...' : 'Claim Superadmin'}
              </button>
            </div>
          )}

          <div className="space-y-4 pt-4">
            <button 
              onClick={handleAuthClick}
              disabled={loginStatus === 'logging-in'}
              className="w-full inline-flex items-center justify-center rounded-2xl text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring bg-primary text-primary-foreground hover:bg-primary/90 h-14 px-8 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loginStatus === 'logging-in' ? 'Logging in...' : iiLoggedIn ? 'Logout' : 'Login Internet Identity'}
            </button>
            
            <button 
              onClick={handleRuangKerjaClick}
              disabled={!isRuangKerjaEnabled || checking}
              className="w-full inline-flex items-center justify-center rounded-2xl text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring bg-secondary text-secondary-foreground hover:bg-secondary/80 h-14 px-8 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {checking ? 'Checking...' : 'Ruang kerja'}
            </button>

            {warningText && (
              <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive text-center">{warningText}</p>
                {warningText === 'Akun belum terdaftar' && (
                  <div className="mt-3 text-center">
                    <a
                      href="/internal/register"
                      className="inline-flex items-center justify-center rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring bg-secondary text-secondary-foreground hover:bg-secondary/80 h-9 px-4"
                    >
                      Ke pendaftaran
                    </a>
                  </div>
                )}
              </div>
            )}
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
