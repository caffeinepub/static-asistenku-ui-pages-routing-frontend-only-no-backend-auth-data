import { useState } from 'react';
import PageShell from '../_shared/PageShell';
import { useInternetIdentity } from '../../hooks/useInternetIdentity';
import { useActor } from '../../hooks/useActor';
import { InternalRole } from '../../backend';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle } from 'lucide-react';

type RoleOption = {
  value: InternalRole;
  label: string;
  description: string;
};

const ROLE_OPTIONS: RoleOption[] = [
  { value: InternalRole.admin, label: 'Admin', description: 'System administration' },
  { value: InternalRole.finance, label: 'Finance', description: 'Financial management' },
  { value: InternalRole.asistenmu, label: 'Asistenmu', description: 'Task coordination' },
  { value: InternalRole.concierge, label: 'Concierge', description: 'Client services' },
];

// Add Supervisor and Management as extended options (mapped to closest backend role)
const EXTENDED_ROLE_OPTIONS: Array<{ value: InternalRole; label: string; description: string }> = [
  ...ROLE_OPTIONS,
  { value: InternalRole.admin, label: 'Supervisor', description: 'Team supervision' },
  { value: InternalRole.admin, label: 'Management', description: 'Strategic management' },
];

export default function InternalRegister() {
  const { login, clear, identity, loginStatus } = useInternetIdentity();
  const { actor, isFetching: actorFetching } = useActor();

  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [selectedRole, setSelectedRole] = useState<InternalRole | null>(null);
  const [selectedRoleLabel, setSelectedRoleLabel] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isLoggedIn = !!identity;
  const isLoggingIn = loginStatus === 'logging-in';

  const handleLogin = async () => {
    try {
      await login();
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Login failed');
    }
  };

  const handleLogout = async () => {
    await clear();
    setNama('');
    setEmail('');
    setWhatsapp('');
    setSelectedRole(null);
    setSelectedRoleLabel('');
    setError(null);
    setSuccess(false);
  };

  const handleRoleSelect = (role: InternalRole, label: string) => {
    setSelectedRole(role);
    setSelectedRoleLabel(label);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!actor || actorFetching || !isLoggedIn || !selectedRole) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await actor.registerInternal({
        name: nama,
        email,
        whatsapp,
        role: selectedRole,
      });
      setSuccess(true);
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = nama.trim() !== '' && email.trim() !== '' && whatsapp.trim() !== '' && selectedRole !== null;
  const isSubmitDisabled = !isLoggedIn || !actor || actorFetching || !isFormValid || loading;

  const navigateToLogin = () => {
    window.history.pushState({}, '', '/internal/login');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  // Success screen
  if (success) {
    return (
      <PageShell>
        <div className="flex justify-center mb-12">
          <img src="/assets/asistenku-horizontal.png" alt="Asistenku" className="h-12 md:h-14 w-auto" />
        </div>

        <Card className="rounded-3xl shadow-xl border border-[#d4c5a9]/30 bg-[#f5f1e8]">
          <CardContent className="p-10 space-y-6 text-center">
            <div className="flex justify-center">
              <CheckCircle2 className="h-16 w-16 text-green-600" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-[#0f2942]">Registration Successful</h2>
              <p className="text-[#5a6c7d]">Registration successful. Awaiting approval.</p>
            </div>
            <Button
              onClick={navigateToLogin}
              className="bg-[#2d9cdb] hover:bg-[#2589c4] text-white rounded-2xl h-12 px-8 shadow-md"
            >
              Back to Internal Login
            </Button>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  // Login gate screen
  if (!isLoggedIn) {
    return (
      <PageShell>
        <div className="flex justify-center mb-12">
          <img src="/assets/asistenku-horizontal.png" alt="Asistenku" className="h-12 md:h-14 w-auto" />
        </div>

        <Card className="rounded-3xl shadow-xl border border-[#d4c5a9]/30 bg-[#f5f1e8]">
          <CardHeader className="text-center space-y-3 pb-6">
            <CardTitle className="text-3xl font-semibold text-[#0f2942]">Login Internet Identity</CardTitle>
            <CardDescription className="text-[#5a6c7d] text-lg">
              Please log in first to continue internal registration.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 px-10 pb-10">
            <Button
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="w-full bg-[#2d9cdb] hover:bg-[#2589c4] text-white rounded-2xl h-14 text-base shadow-md"
            >
              {isLoggingIn ? 'Logging in...' : 'Login Internet Identity'}
            </Button>

            <div className="text-center pt-4">
              <a href="/internal/login" className="text-sm text-[#5a6c7d] hover:text-[#0f2942] transition-colors">
                Back
              </a>
            </div>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  // Main registration form (logged in)
  return (
    <PageShell>
      <div className="flex justify-center mb-12">
        <img src="/assets/asistenku-horizontal.png" alt="Asistenku" className="h-12 md:h-14 w-auto" />
      </div>

      <Card className="rounded-3xl shadow-xl border border-[#d4c5a9]/30 bg-[#f5f1e8]">
        <CardHeader className="text-center space-y-3 pb-6">
          <div className="flex items-center justify-center gap-3">
            <CardTitle className="text-3xl font-semibold text-[#0f2942]">Internal Registration</CardTitle>
            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
              Logged in
            </Badge>
          </div>
          <CardDescription className="text-[#5a6c7d] text-lg">
            Fill in your details to register.
          </CardDescription>
        </CardHeader>

        <CardContent className="px-10 pb-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive" className="rounded-xl">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div>
                <Label htmlFor="nama" className="text-sm font-medium text-[#0f2942] mb-2">
                  Name
                </Label>
                <Input
                  id="nama"
                  type="text"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  className="rounded-xl border-[#d4c5a9] bg-white text-[#0f2942] focus:ring-[#2d9cdb]"
                  placeholder="Full name"
                  required
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-sm font-medium text-[#0f2942] mb-2">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-xl border-[#d4c5a9] bg-white text-[#0f2942] focus:ring-[#2d9cdb]"
                  placeholder="email@example.com"
                  required
                />
              </div>

              <div>
                <Label htmlFor="whatsapp" className="text-sm font-medium text-[#0f2942] mb-2">
                  WhatsApp
                </Label>
                <Input
                  id="whatsapp"
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="rounded-xl border-[#d4c5a9] bg-white text-[#0f2942] focus:ring-[#2d9cdb]"
                  placeholder="+62..."
                  required
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-[#0f2942] mb-3 block">
                  Role <span className="text-red-500">*</span>
                </Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {EXTENDED_ROLE_OPTIONS.map((option) => (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => handleRoleSelect(option.value, option.label)}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        selectedRoleLabel === option.label
                          ? 'border-[#2d9cdb] bg-[#2d9cdb]/10 shadow-md'
                          : 'border-[#d4c5a9] bg-white hover:border-[#2d9cdb]/50'
                      }`}
                    >
                      <div className="font-semibold text-[#0f2942] text-sm">{option.label}</div>
                      <div className="text-xs text-[#5a6c7d] mt-1">{option.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={isSubmitDisabled}
                className="flex-1 bg-[#2d9cdb] hover:bg-[#2589c4] text-white rounded-2xl h-14 text-base shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Submitting...' : 'Register'}
              </Button>
              <Button
                type="button"
                onClick={handleLogout}
                variant="outline"
                className="rounded-2xl h-14 px-6 border-[#d4c5a9] text-[#5a6c7d] hover:bg-[#d4c5a9]/20"
              >
                Logout
              </Button>
            </div>

            <div className="text-center pt-2">
              <a href="/internal/login" className="text-sm text-[#5a6c7d] hover:text-[#0f2942] transition-colors">
                Back to Login
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
    </PageShell>
  );
}
