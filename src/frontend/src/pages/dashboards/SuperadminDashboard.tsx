import { useState } from 'react';
import { useInternetIdentity } from '../../hooks/useInternetIdentity';
import { useActor } from '../../hooks/useActor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export default function SuperadminDashboard() {
  const { identity, clear } = useInternetIdentity();
  const { actor, isFetching: actorFetching } = useActor();

  const isAnonymous = !identity;

  const handleLogout = async () => {
    await clear();
    window.location.href = '/';
  };

  if (isAnonymous) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f2942] via-[#1a4d6f] to-[#d4c5a9] flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-[#f5f1e8] border-[#d4c5a9]">
          <CardContent className="pt-6">
            <p className="text-center text-[#0f2942]">Please log in to access the dashboard.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f2942] via-[#1a4d6f] to-[#d4c5a9]">
      <header className="bg-[#0f2942]/80 backdrop-blur-sm border-b border-[#d4c5a9]/20 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <img src="/assets/asistenku-horizontal.png" alt="Asistenku" className="h-8" />
          <Button
            type="button"
            onClick={handleLogout}
            disabled={true}
            variant="outline"
            className="bg-[#d4c5a9] text-[#0f2942] hover:bg-[#d4c5a9]/90 border-[#d4c5a9]"
          >
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="bg-[#f5f1e8] border-[#d4c5a9]">
          <CardHeader>
            <CardTitle className="text-[#0f2942]">Superadmin Dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            {actorFetching ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-[#2d9cdb]" />
              </div>
            ) : (
              <p className="text-[#5a6c7d]">
                Dashboard features are being developed. Backend Layanan V4 system has been implemented.
              </p>
            )}
          </CardContent>
        </Card>
      </main>

      <footer className="mt-auto py-6 text-center text-sm text-[#d4c5a9]">
        <p>Asistenku © {new Date().getFullYear()} PT. Asistenku Digital Indonesia</p>
      </footer>
    </div>
  );
}
