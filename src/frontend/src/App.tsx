import { useState, useEffect } from 'react';
import Landing from './pages/Landing';
import ClientLogin from './pages/client/ClientLogin';
import ClientRegister from './pages/client/ClientRegister';
import PartnerLogin from './pages/partner/PartnerLogin';
import PartnerRegister from './pages/partner/PartnerRegister';
import InternalLanding from './pages/internal/InternalLanding';
import InternalLogin from './pages/internal/InternalLogin';
import InternalRegister from './pages/internal/InternalRegister';
import SuperadminDashboard from './pages/dashboards/SuperadminDashboard';
import AdminDashboard from './pages/dashboards/AdminDashboard';
import FinanceDashboard from './pages/dashboards/FinanceDashboard';
import ConciergeDashboard from './pages/dashboards/ConciergeDashboard';
import AsistenmuDashboard from './pages/dashboards/AsistenmuDashboard';
import ClientDashboard from './pages/dashboards/ClientDashboard';
import PartnerDashboard from './pages/dashboards/PartnerDashboard';

function NotFound() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center space-y-6">
        <h1 className="text-6xl font-bold text-foreground">404</h1>
        <p className="text-muted-foreground">Halaman tidak ditemukan</p>
        <a href="/">
          <button className="inline-flex items-center justify-center rounded-2xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8">
            Kembali ke Landing
          </button>
        </a>
      </div>
    </div>
  );
}

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const renderPage = () => {
    switch (currentPath) {
      case '/':
        return <Landing />;
      case '/client/login':
        return <ClientLogin />;
      case '/client/register':
        return <ClientRegister />;
      case '/partner/login':
        return <PartnerLogin />;
      case '/partner/register':
        return <PartnerRegister />;
      case '/internal':
        return <InternalLanding />;
      case '/internal/login':
        return <InternalLogin />;
      case '/internal/register':
        return <InternalRegister />;
      case '/superadmin/dashboard':
        return <SuperadminDashboard />;
      case '/admin/dashboard':
        return <AdminDashboard />;
      case '/finance/dashboard':
        return <FinanceDashboard />;
      case '/concierge/dashboard':
        return <ConciergeDashboard />;
      case '/asistenmu/dashboard':
        return <AsistenmuDashboard />;
      case '/client/dashboard':
        return <ClientDashboard />;
      case '/partner/dashboard':
        return <PartnerDashboard />;
      default:
        return <NotFound />;
    }
  };

  return renderPage();
}
