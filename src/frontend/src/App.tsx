import { useState, useEffect } from 'react';
import Landing from './pages/Landing';
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
import ExternalClientLogin from './pages/external/ClientLogin';
import ExternalClientRegister from './pages/external/ClientRegister';
import ExternalPartnerLogin from './pages/external/PartnerLogin';
import ExternalPartnerRegister from './pages/external/PartnerRegister';

function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f2942] via-[#1a3a52] to-[#e8dcc4] flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center space-y-6 rounded-3xl shadow-xl border border-[#d4c5a9]/30 p-10 bg-[#f5f1e8]">
        <h1 className="text-6xl font-bold text-[#0f2942]">404</h1>
        <p className="text-[#5a6c7d]">Halaman tidak ditemukan</p>
        <a href="/">
          <button className="inline-flex items-center justify-center rounded-2xl text-sm font-medium transition-colors bg-[#2d9cdb] text-white hover:bg-[#2589c4] h-11 px-8 shadow-md">
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
      case '/external/client/login':
        return <ExternalClientLogin />;
      case '/external/client/register':
        return <ExternalClientRegister />;
      case '/external/partner/login':
        return <ExternalPartnerLogin />;
      case '/external/partner/register':
        return <ExternalPartnerRegister />;
      case '/internal':
        return <InternalLanding />;
      case '/internal/login':
        return <InternalLogin />;
      case '/internal/register':
        return <InternalRegister />;
      case '/internal/daftar':
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
