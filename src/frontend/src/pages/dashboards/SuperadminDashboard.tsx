import { useState, useEffect } from 'react';
import { useInternetIdentity } from '../../hooks/useInternetIdentity';
import { useActor } from '../../hooks/useActor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Loader2, AlertCircle, ChevronDown, ChevronUp, Search, RefreshCw } from 'lucide-react';
import { 
  LayananV4, 
  LayananTypeV4, 
  UserRole, 
  SkillVerified, 
  KamusPekerjaan, 
  AturanBebanPerusahaan,
  TipePartner,
  Variant_TAMBAH_PER_JAM_TAMBAH_JAM_TETAP,
  InternalRole,
  ApprovalStatus,
  SuperadminSummaryV1
} from '../../backend';
import { Principal } from '@icp-sdk/core/principal';

type TabId = 'ringkasan' | 'users' | 'masterdata' | 'rates' | 'tasks' | 'layanan';

export default function SuperadminDashboard() {
  const { identity, clear } = useInternetIdentity();
  const { actor, isFetching: actorFetching } = useActor();

  const [activeTab, setActiveTab] = useState<TabId>('ringkasan');
  const [error, setError] = useState<string | null>(null);

  // === RINGKASAN TAB STATE ===
  const [statsLoading, setStatsLoading] = useState(false);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalSkills, setTotalSkills] = useState(0);
  const [totalKamus, setTotalKamus] = useState(0);
  const [totalAturan, setTotalAturan] = useState(0);

  // === RINGKASAN V1 STATE (APPEND ONLY) ===
  const [summaryV1, setSummaryV1] = useState<SuperadminSummaryV1 | null>(null);
  const [summaryV1Loading, setSummaryV1Loading] = useState(false);
  const [summaryV1Error, setSummaryV1Error] = useState<string | null>(null);

  // === USERS TAB STATE ===
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersList, setUsersList] = useState<Array<[Principal, UserRole]>>([]);
  const [usersSearch, setUsersSearch] = useState('');
  const [usersExpanded, setUsersExpanded] = useState<Record<string, boolean>>({});

  // === MASTER DATA TAB STATE ===
  const [masterDataSection, setMasterDataSection] = useState<'skills' | 'kamus' | 'aturan' | 'konstanta'>('skills');
  
  // Skills
  const [skillsList, setSkillsList] = useState<SkillVerified[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [skillModalOpen, setSkillModalOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<SkillVerified | null>(null);
  const [skillForm, setSkillForm] = useState({ kode: '', nama: '', kategori: '', aktif: true });

  // Kamus Pekerjaan
  const [kamusList, setKamusList] = useState<KamusPekerjaan[]>([]);
  const [kamusLoading, setKamusLoading] = useState(false);
  const [kamusModalOpen, setKamusModalOpen] = useState(false);
  const [editingKamus, setEditingKamus] = useState<KamusPekerjaan | null>(null);
  const [kamusForm, setKamusForm] = useState({
    kode: '',
    kategoriPekerjaan: '',
    jenisPekerjaan: '',
    jamStandar: '',
    tipePartnerBoleh: [] as TipePartner[],
    aktif: true,
  });

  // Aturan Beban
  const [aturanList, setAturanList] = useState<AturanBebanPerusahaan[]>([]);
  const [aturanLoading, setAturanLoading] = useState(false);
  const [aturanModalOpen, setAturanModalOpen] = useState(false);
  const [editingAturan, setEditingAturan] = useState<AturanBebanPerusahaan | null>(null);
  const [aturanForm, setAturanForm] = useState({
    kode: '',
    tipePartner: TipePartner.junior,
    jamMin: '',
    jamMax: '',
    polaBeban: Variant_TAMBAH_PER_JAM_TAMBAH_JAM_TETAP.TAMBAH_JAM_TETAP,
    nilai: '',
    aktif: true,
  });

  // Konstanta
  const [konstantaValue, setKonstantaValue] = useState('');
  const [konstantaLoading, setKonstantaLoading] = useState(false);

  // === RATES TAB STATE ===
  const [ratesData, setRatesData] = useState<{ junior: string; senior: string; expert: string }>({
    junior: '35000',
    senior: '55000',
    expert: '75000',
  });

  // === TASKS TAB STATE ===
  const [tasksMessage, setTasksMessage] = useState('Task management features coming soon.');

  // === LAYANAN TAB STATE ===
  const [layananList, setLayananList] = useState<LayananV4[]>([]);
  const [layananLoading, setLayananLoading] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedLayanan, setSelectedLayanan] = useState<LayananV4 | null>(null);
  const [archiveConfirmId, setArchiveConfirmId] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState({
    clientPrincipal: '',
    tipe: LayananTypeV4.TENANG,
    unitTotal: '',
    hargaPerUnit: '',
    asistenmuPrincipal: '',
    sharedWith: '',
    isActive: true,
  });

  const [editForm, setEditForm] = useState({
    clientPrincipal: '',
    tipe: LayananTypeV4.TENANG,
    unitTotal: '',
    hargaPerUnit: '',
    asistenmuPrincipal: '',
    sharedWith: '',
    isActive: true,
  });

  const isAnonymous = !identity;
  const actorReady = actor && !actorFetching;

  const handleLogout = async () => {
    await clear();
    window.location.href = '/';
  };

  // === RINGKASAN TAB FUNCTIONS ===
  const fetchStats = async () => {
    if (!actor || actorFetching) return;
    setStatsLoading(true);
    setError(null);
    try {
      const [users, skills, kamus, aturan] = await Promise.all([
        actor.getAllUsers?.() || [],
        actor.listSkillVerified?.() || [],
        actor.listKamusPekerjaan?.() || [],
        actor.listAturanBeban?.() || [],
      ]);
      setTotalUsers(users.length);
      setTotalSkills(skills.length);
      setTotalKamus(kamus.length);
      setTotalAturan(aturan.length);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch statistics');
    } finally {
      setStatsLoading(false);
    }
  };

  // === RINGKASAN V1 FUNCTIONS (APPEND ONLY) ===
  const fetchSummaryV1 = async () => {
    if (!actor || actorFetching || isAnonymous) return;
    
    if (typeof actor.getSuperadminSummaryV1 !== 'function') {
      setSummaryV1Error('Summary V1 method is not available in the backend');
      return;
    }

    setSummaryV1Loading(true);
    setSummaryV1Error(null);
    try {
      const summary = await actor.getSuperadminSummaryV1();
      setSummaryV1(summary);
    } catch (err: any) {
      setSummaryV1Error(err.message || 'Failed to fetch summary V1');
    } finally {
      setSummaryV1Loading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'ringkasan' && actorReady) {
      fetchStats();
      fetchSummaryV1();
    }
  }, [activeTab, actorReady]);

  // === USERS TAB FUNCTIONS ===
  const fetchUsers = async () => {
    if (!actor || actorFetching) return;
    setUsersLoading(true);
    setError(null);
    try {
      const users = await actor.getAllUsers();
      setUsersList(users);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch users');
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'users' && actorReady) {
      fetchUsers();
    }
  }, [activeTab, actorReady]);

  const toggleUserExpanded = (principal: string) => {
    setUsersExpanded(prev => ({ ...prev, [principal]: !prev[principal] }));
  };

  const getRoleLabel = (role: UserRole): string => {
    if ('client' in role) return 'Client';
    if ('partner' in role) return 'Partner';
    if ('internal' in role) return 'Internal';
    if ('superadmin' in role) return 'Superadmin';
    return 'Unknown';
  };

  const filteredUsers = usersList.filter(([principal, role]) => {
    const searchLower = usersSearch.toLowerCase();
    const principalStr = principal.toString().toLowerCase();
    const roleLabel = getRoleLabel(role).toLowerCase();
    return principalStr.includes(searchLower) || roleLabel.includes(searchLower);
  });

  // === MASTER DATA TAB FUNCTIONS ===
  
  // Skills
  const fetchSkills = async () => {
    if (!actor || actorFetching) return;
    setSkillsLoading(true);
    setError(null);
    try {
      const skills = await actor.listSkillVerified();
      setSkillsList(skills);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch skills');
    } finally {
      setSkillsLoading(false);
    }
  };

  const handleSaveSkill = async () => {
    if (!actor || actorFetching) return;
    setError(null);
    try {
      const kodeOpt = editingSkill ? editingSkill.kode : null;
      await actor.upsertSkillVerified(kodeOpt, skillForm.nama, skillForm.kategori, skillForm.aktif);
      setSkillModalOpen(false);
      setEditingSkill(null);
      setSkillForm({ kode: '', nama: '', kategori: '', aktif: true });
      await fetchSkills();
    } catch (err: any) {
      setError(err.message || 'Failed to save skill');
    }
  };

  const openSkillModal = (skill?: SkillVerified) => {
    if (skill) {
      setEditingSkill(skill);
      setSkillForm({
        kode: skill.kode,
        nama: skill.nama,
        kategori: skill.kategori,
        aktif: skill.aktif,
      });
    } else {
      setEditingSkill(null);
      setSkillForm({ kode: '', nama: '', kategori: '', aktif: true });
    }
    setSkillModalOpen(true);
  };

  // Kamus Pekerjaan
  const fetchKamus = async () => {
    if (!actor || actorFetching) return;
    setKamusLoading(true);
    setError(null);
    try {
      const kamus = await actor.listKamusPekerjaan();
      setKamusList(kamus);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch kamus pekerjaan');
    } finally {
      setKamusLoading(false);
    }
  };

  const handleSaveKamus = async () => {
    if (!actor || actorFetching) return;
    setError(null);
    try {
      const kodeOpt = editingKamus ? kamusForm.kode : null;
      await actor.upsertKamusPekerjaan(
        kodeOpt,
        kamusForm.kategoriPekerjaan,
        kamusForm.jenisPekerjaan,
        BigInt(kamusForm.jamStandar),
        kamusForm.tipePartnerBoleh,
        kamusForm.aktif
      );
      setKamusModalOpen(false);
      setEditingKamus(null);
      setKamusForm({
        kode: '',
        kategoriPekerjaan: '',
        jenisPekerjaan: '',
        jamStandar: '',
        tipePartnerBoleh: [],
        aktif: true,
      });
      await fetchKamus();
    } catch (err: any) {
      setError(err.message || 'Failed to save kamus pekerjaan');
    }
  };

  const openKamusModal = (kamus?: KamusPekerjaan) => {
    if (kamus) {
      setEditingKamus(kamus);
      setKamusForm({
        kode: '',
        kategoriPekerjaan: kamus.kategoriPekerjaan,
        jenisPekerjaan: kamus.jenisPekerjaan,
        jamStandar: kamus.jamStandar.toString(),
        tipePartnerBoleh: kamus.tipePartnerBoleh,
        aktif: kamus.aktif,
      });
    } else {
      setEditingKamus(null);
      setKamusForm({
        kode: '',
        kategoriPekerjaan: '',
        jenisPekerjaan: '',
        jamStandar: '',
        tipePartnerBoleh: [],
        aktif: true,
      });
    }
    setKamusModalOpen(true);
  };

  // Aturan Beban
  const fetchAturan = async () => {
    if (!actor || actorFetching) return;
    setAturanLoading(true);
    setError(null);
    try {
      const aturan = await actor.listAturanBeban();
      setAturanList(aturan);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch aturan beban');
    } finally {
      setAturanLoading(false);
    }
  };

  const handleSaveAturan = async () => {
    if (!actor || actorFetching) return;
    setError(null);
    try {
      const kodeOpt = editingAturan ? aturanForm.kode : null;
      await actor.upsertAturanBeban(
        kodeOpt,
        aturanForm.tipePartner,
        BigInt(aturanForm.jamMin),
        BigInt(aturanForm.jamMax),
        aturanForm.polaBeban,
        BigInt(aturanForm.nilai),
        aturanForm.aktif
      );
      setAturanModalOpen(false);
      setEditingAturan(null);
      setAturanForm({
        kode: '',
        tipePartner: TipePartner.junior,
        jamMin: '',
        jamMax: '',
        polaBeban: Variant_TAMBAH_PER_JAM_TAMBAH_JAM_TETAP.TAMBAH_JAM_TETAP,
        nilai: '',
        aktif: true,
      });
      await fetchAturan();
    } catch (err: any) {
      setError(err.message || 'Failed to save aturan beban');
    }
  };

  const openAturanModal = (aturan?: AturanBebanPerusahaan) => {
    if (aturan) {
      setEditingAturan(aturan);
      setAturanForm({
        kode: '',
        tipePartner: aturan.tipePartner,
        jamMin: aturan.jamMin.toString(),
        jamMax: aturan.jamMax.toString(),
        polaBeban: aturan.polaBeban,
        nilai: aturan.nilai.toString(),
        aktif: aturan.aktif,
      });
    } else {
      setEditingAturan(null);
      setAturanForm({
        kode: '',
        tipePartner: TipePartner.junior,
        jamMin: '',
        jamMax: '',
        polaBeban: Variant_TAMBAH_PER_JAM_TAMBAH_JAM_TETAP.TAMBAH_JAM_TETAP,
        nilai: '',
        aktif: true,
      });
    }
    setAturanModalOpen(true);
  };

  // Konstanta
  const fetchKonstanta = async () => {
    if (!actor || actorFetching) return;
    setKonstantaLoading(true);
    setError(null);
    try {
      const konstanta = await actor.getKonstantaUnitClient();
      setKonstantaValue(konstanta.unitKeJamPerusahaan.toString());
    } catch (err: any) {
      setError(err.message || 'Failed to fetch konstanta');
    } finally {
      setKonstantaLoading(false);
    }
  };

  const handleSaveKonstanta = async () => {
    if (!actor || actorFetching) return;
    setError(null);
    try {
      await actor.setKonstantaUnitClient(BigInt(konstantaValue));
      alert('Konstanta updated successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to save konstanta');
    }
  };

  useEffect(() => {
    if (activeTab === 'masterdata' && actorReady) {
      if (masterDataSection === 'skills') fetchSkills();
      if (masterDataSection === 'kamus') fetchKamus();
      if (masterDataSection === 'aturan') fetchAturan();
      if (masterDataSection === 'konstanta') fetchKonstanta();
    }
  }, [activeTab, masterDataSection, actorReady]);

  // === LAYANAN TAB FUNCTIONS ===
  const fetchLayananList = async () => {
    if (!actor || actorFetching) return;
    
    if (typeof actor.listAllLayananV4 !== 'function') {
      setError('Backend method listAllLayananV4 is not available');
      return;
    }

    setLayananLoading(true);
    setError(null);
    try {
      const result = await actor.listAllLayananV4(showArchived);
      setLayananList(result);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch Layanan list');
    } finally {
      setLayananLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'layanan' && actorReady) {
      fetchLayananList();
    }
  }, [activeTab, actorReady, showArchived]);

  const handleCreate = async () => {
    if (!actor || actorFetching) return;

    if (typeof actor.createLayananV4 !== 'function') {
      setError('Backend method createLayananV4 is not available');
      return;
    }

    setError(null);
    try {
      const clientPrincipal = Principal.fromText(createForm.clientPrincipal.trim());
      const asistenmuPrincipal = Principal.fromText(createForm.asistenmuPrincipal.trim());
      
      const sharedWithLines = createForm.sharedWith
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
      const sharedWith = sharedWithLines.map(line => Principal.fromText(line));

      const unitTotal = BigInt(createForm.unitTotal);
      const hargaPerUnit = BigInt(createForm.hargaPerUnit);

      await actor.createLayananV4({
        clientPrincipal,
        tipe: createForm.tipe,
        unitTotal,
        hargaPerUnit,
        asistenmuPrincipal,
        sharedWith,
        isActive: createForm.isActive,
      });

      setCreateForm({
        clientPrincipal: '',
        tipe: LayananTypeV4.TENANG,
        unitTotal: '',
        hargaPerUnit: '',
        asistenmuPrincipal: '',
        sharedWith: '',
        isActive: true,
      });
      setCreateModalOpen(false);
      await fetchLayananList();
    } catch (err: any) {
      setError(err.message || 'Failed to create Layanan');
    }
  };

  const handleEdit = async () => {
    if (!actor || actorFetching || !selectedLayanan) return;

    if (typeof actor.editLayananV4 !== 'function') {
      setError('Backend method editLayananV4 is not available');
      return;
    }

    setError(null);
    try {
      const clientPrincipal = Principal.fromText(editForm.clientPrincipal.trim());
      const asistenmuPrincipal = Principal.fromText(editForm.asistenmuPrincipal.trim());
      
      const sharedWithLines = editForm.sharedWith
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
      const sharedWith = sharedWithLines.map(line => Principal.fromText(line));

      const unitTotal = BigInt(editForm.unitTotal);
      const hargaPerUnit = BigInt(editForm.hargaPerUnit);

      await actor.editLayananV4(selectedLayanan.id, {
        clientPrincipal,
        tipe: editForm.tipe,
        unitTotal,
        hargaPerUnit,
        asistenmuPrincipal,
        sharedWith,
        isActive: editForm.isActive,
      });

      setEditModalOpen(false);
      setSelectedLayanan(null);
      await fetchLayananList();
    } catch (err: any) {
      setError(err.message || 'Failed to edit Layanan');
    }
  };

  const handleArchive = async (layananId: string) => {
    if (!actor || actorFetching) return;

    if (typeof actor.archiveLayananV4 !== 'function') {
      setError('Backend method archiveLayananV4 is not available');
      return;
    }

    setError(null);
    try {
      await actor.archiveLayananV4(layananId);
      setArchiveConfirmId(null);
      await fetchLayananList();
    } catch (err: any) {
      setError(err.message || 'Failed to archive Layanan');
    }
  };

  const handleToggleActive = async (layananId: string, currentActive: boolean) => {
    if (!actor || actorFetching) return;

    if (typeof actor.setLayananV4Active !== 'function') {
      setError('Backend method setLayananV4Active is not available');
      return;
    }

    setError(null);
    try {
      await actor.setLayananV4Active(layananId, !currentActive);
      await fetchLayananList();
    } catch (err: any) {
      setError(err.message || 'Failed to toggle active status');
    }
  };

  const openEditModal = (layanan: LayananV4) => {
    setSelectedLayanan(layanan);
    setEditForm({
      clientPrincipal: layanan.clientPrincipal.toString(),
      tipe: layanan.tipe,
      unitTotal: layanan.unitTotal.toString(),
      hargaPerUnit: layanan.hargaPerUnit.toString(),
      asistenmuPrincipal: layanan.asistenmuPrincipal.toString(),
      sharedWith: layanan.sharedWith.map(p => p.toString()).join('\n'),
      isActive: layanan.isActive,
    });
    setEditModalOpen(true);
  };

  if (isAnonymous) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a2332] via-[#2a3a4a] to-[#d4c5b0] flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-[#f5f0e8] border-[#8b7355]">
          <CardHeader>
            <CardTitle className="text-[#1a2332]">Authentication Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[#4a5568] mb-4">Please log in to access the Superadmin Dashboard.</p>
            <Button onClick={() => window.location.href = '/internal/login'} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a2332] via-[#2a3a4a] to-[#d4c5b0]">
      {/* Mini Header */}
      <header className="bg-[#1a2332]/90 backdrop-blur-sm border-b border-[#8b7355]/30 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/assets/asistenku-horizontal.png" alt="Asistenku" className="h-8" />
            <span className="text-[#f5f0e8] font-semibold text-lg">Superadmin Control Room</span>
          </div>
          <Button onClick={handleLogout} variant="outline" size="sm" className="border-[#8b7355] text-[#f5f0e8] hover:bg-[#8b7355]/20">
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="mb-6 flex flex-wrap gap-2">
          {(['ringkasan', 'users', 'masterdata', 'rates', 'tasks', 'layanan'] as TabId[]).map(tab => (
            <Button
              key={tab}
              onClick={() => setActiveTab(tab)}
              variant={activeTab === tab ? 'default' : 'outline'}
              className={activeTab === tab ? 'bg-[#1a7a8a] text-white' : 'border-[#8b7355] text-[#f5f0e8] hover:bg-[#8b7355]/20'}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Button>
          ))}
        </div>

        {/* Global Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Tab Content */}
        {activeTab === 'ringkasan' && (
          <div className="space-y-6">
            <Card className="bg-[#f5f0e8] border-[#8b7355]">
              <CardHeader>
                <CardTitle className="text-[#1a2332]">System Overview</CardTitle>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-[#1a7a8a]" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 bg-white rounded-lg border border-[#8b7355]/30">
                      <div className="text-sm text-[#4a5568]">Total Users</div>
                      <div className="text-2xl font-bold text-[#1a2332]">{totalUsers}</div>
                    </div>
                    <div className="p-4 bg-white rounded-lg border border-[#8b7355]/30">
                      <div className="text-sm text-[#4a5568]">Skills Verified</div>
                      <div className="text-2xl font-bold text-[#1a2332]">{totalSkills}</div>
                    </div>
                    <div className="p-4 bg-white rounded-lg border border-[#8b7355]/30">
                      <div className="text-sm text-[#4a5568]">Kamus Pekerjaan</div>
                      <div className="text-2xl font-bold text-[#1a2332]">{totalKamus}</div>
                    </div>
                    <div className="p-4 bg-white rounded-lg border border-[#8b7355]/30">
                      <div className="text-sm text-[#4a5568]">Aturan Beban</div>
                      <div className="text-2xl font-bold text-[#1a2332]">{totalAturan}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* RINGKASAN V1 BLOCK (APPEND ONLY) */}
            <Card className="bg-[#f5f0e8] border-[#8b7355]">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-[#1a2332]">Real-Time Summary V1</CardTitle>
                <Button
                  onClick={fetchSummaryV1}
                  disabled={summaryV1Loading || !actorReady}
                  variant="outline"
                  size="sm"
                  className="border-[#8b7355] text-[#1a2332] hover:bg-[#8b7355]/20"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${summaryV1Loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </CardHeader>
              <CardContent>
                {summaryV1Loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-[#1a7a8a]" />
                  </div>
                ) : summaryV1Error ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{summaryV1Error}</AlertDescription>
                  </Alert>
                ) : summaryV1 ? (
                  <div className="space-y-6">
                    {/* Users Section */}
                    <div>
                      <h3 className="text-lg font-semibold text-[#1a2332] mb-3">Users</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="p-4 bg-white rounded-lg border border-[#8b7355]/30">
                          <div className="text-sm text-[#4a5568]">Clients</div>
                          <div className="text-2xl font-bold text-[#1a2332]">{Number(summaryV1.clientsCount)}</div>
                        </div>
                        <div className="p-4 bg-white rounded-lg border border-[#8b7355]/30">
                          <div className="text-sm text-[#4a5568]">Partners</div>
                          <div className="text-2xl font-bold text-[#1a2332]">{Number(summaryV1.partnersCount)}</div>
                        </div>
                        <div className="p-4 bg-white rounded-lg border border-[#8b7355]/30">
                          <div className="text-sm text-[#4a5568]">Partner Levels</div>
                          <div className="text-xs text-[#4a5568] mt-1">
                            Junior: {Number(summaryV1.partnerLevelJunior)} | Senior: {Number(summaryV1.partnerLevelSenior)} | Expert: {Number(summaryV1.partnerLevelExpert)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Layanan Section */}
                    <div>
                      <h3 className="text-lg font-semibold text-[#1a2332] mb-3">Layanan V4</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="p-4 bg-white rounded-lg border border-[#8b7355]/30">
                          <div className="text-sm text-[#4a5568]">Total Layanan</div>
                          <div className="text-2xl font-bold text-[#1a2332]">{Number(summaryV1.totalLayananV4)}</div>
                        </div>
                        <div className="p-4 bg-white rounded-lg border border-[#8b7355]/30">
                          <div className="text-sm text-[#4a5568]">Active Layanan</div>
                          <div className="text-2xl font-bold text-[#1a7a8a]">{Number(summaryV1.layananActive)}</div>
                        </div>
                        <div className="p-4 bg-white rounded-lg border border-[#8b7355]/30">
                          <div className="text-sm text-[#4a5568]">Total GMV</div>
                          <div className="text-2xl font-bold text-[#1a2332]">
                            Rp {Number(summaryV1.totalGMV).toLocaleString('id-ID')}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Tasks Section */}
                    <div>
                      <h3 className="text-lg font-semibold text-[#1a2332] mb-3">Tasks</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="p-4 bg-white rounded-lg border border-[#8b7355]/30">
                          <div className="text-sm text-[#4a5568]">Total Tasks</div>
                          <div className="text-2xl font-bold text-[#1a2332]">{Number(summaryV1.totalTasks)}</div>
                        </div>
                        <div className="p-4 bg-white rounded-lg border border-[#8b7355]/30">
                          <div className="text-sm text-[#4a5568]">Active Tasks</div>
                          <div className="text-2xl font-bold text-[#1a7a8a]">{Number(summaryV1.tasksActive)}</div>
                        </div>
                        <div className="p-4 bg-white rounded-lg border border-[#8b7355]/30">
                          <div className="text-sm text-[#4a5568]">Completed Tasks</div>
                          <div className="text-2xl font-bold text-green-600">{Number(summaryV1.tasksSelesai)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-[#4a5568]">
                    No summary data available. Click Refresh to load.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'users' && (
          <Card className="bg-[#f5f0e8] border-[#8b7355]">
            <CardHeader>
              <CardTitle className="text-[#1a2332]">All Users</CardTitle>
              <div className="mt-4 flex items-center gap-2">
                <Search className="h-4 w-4 text-[#4a5568]" />
                <Input
                  placeholder="Search by principal or role..."
                  value={usersSearch}
                  onChange={(e) => setUsersSearch(e.target.value)}
                  className="max-w-md"
                />
              </div>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-[#1a7a8a]" />
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredUsers.map(([principal, role]) => {
                    const principalStr = principal.toString();
                    const isExpanded = usersExpanded[principalStr];
                    return (
                      <Collapsible key={principalStr} open={isExpanded} onOpenChange={() => toggleUserExpanded(principalStr)}>
                        <div className="border border-[#8b7355]/30 rounded-lg bg-white">
                          <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-[#f5f0e8]/50 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="text-sm font-medium text-[#1a2332]">{getRoleLabel(role)}</div>
                              <div className="text-xs text-[#4a5568] font-mono">{principalStr.slice(0, 20)}...</div>
                            </div>
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="p-4 border-t border-[#8b7355]/30 bg-[#f5f0e8]/30">
                              <div className="space-y-2 text-sm">
                                <div>
                                  <span className="font-semibold text-[#1a2332]">Principal:</span>
                                  <div className="font-mono text-xs text-[#4a5568] break-all">{principalStr}</div>
                                </div>
                                {'client' in role && (
                                  <>
                                    <div><span className="font-semibold text-[#1a2332]">Name:</span> {role.client.name}</div>
                                    <div><span className="font-semibold text-[#1a2332]">Email:</span> {role.client.email}</div>
                                    <div><span className="font-semibold text-[#1a2332]">WhatsApp:</span> {role.client.whatsapp}</div>
                                    <div><span className="font-semibold text-[#1a2332]">Company:</span> {role.client.company}</div>
                                  </>
                                )}
                                {'partner' in role && (
                                  <>
                                    <div><span className="font-semibold text-[#1a2332]">Name:</span> {role.partner.name}</div>
                                    <div><span className="font-semibold text-[#1a2332]">Email:</span> {role.partner.email}</div>
                                    <div><span className="font-semibold text-[#1a2332]">WhatsApp:</span> {role.partner.whatsapp}</div>
                                    <div><span className="font-semibold text-[#1a2332]">Keahlian:</span> {role.partner.keahlian}</div>
                                    <div><span className="font-semibold text-[#1a2332]">Domisili:</span> {role.partner.domisili}</div>
                                  </>
                                )}
                                {'internal' in role && (
                                  <>
                                    <div><span className="font-semibold text-[#1a2332]">Name:</span> {role.internal.name}</div>
                                    <div><span className="font-semibold text-[#1a2332]">Email:</span> {role.internal.email}</div>
                                    <div><span className="font-semibold text-[#1a2332]">WhatsApp:</span> {role.internal.whatsapp}</div>
                                    <div><span className="font-semibold text-[#1a2332]">Role:</span> {role.internal.role}</div>
                                  </>
                                )}
                              </div>
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'masterdata' && (
          <div className="space-y-6">
            <div className="flex gap-2">
              {(['skills', 'kamus', 'aturan', 'konstanta'] as const).map(section => (
                <Button
                  key={section}
                  onClick={() => setMasterDataSection(section)}
                  variant={masterDataSection === section ? 'default' : 'outline'}
                  className={masterDataSection === section ? 'bg-[#1a7a8a] text-white' : 'border-[#8b7355] text-[#f5f0e8] hover:bg-[#8b7355]/20'}
                >
                  {section.charAt(0).toUpperCase() + section.slice(1)}
                </Button>
              ))}
            </div>

            {masterDataSection === 'skills' && (
              <Card className="bg-[#f5f0e8] border-[#8b7355]">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-[#1a2332]">Skills Verified</CardTitle>
                  <Button onClick={() => openSkillModal()} className="bg-[#1a7a8a] text-white hover:bg-[#1a7a8a]/90">
                    Add Skill
                  </Button>
                </CardHeader>
                <CardContent>
                  {skillsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-[#1a7a8a]" />
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Kode</TableHead>
                          <TableHead>Nama</TableHead>
                          <TableHead>Kategori</TableHead>
                          <TableHead>Aktif</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {skillsList.map(skill => (
                          <TableRow key={skill.kode}>
                            <TableCell className="font-mono text-sm">{skill.kode}</TableCell>
                            <TableCell>{skill.nama}</TableCell>
                            <TableCell>{skill.kategori}</TableCell>
                            <TableCell>{skill.aktif ? '✓' : '✗'}</TableCell>
                            <TableCell>
                              <Button onClick={() => openSkillModal(skill)} size="sm" variant="outline">
                                Edit
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            )}

            {masterDataSection === 'kamus' && (
              <Card className="bg-[#f5f0e8] border-[#8b7355]">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-[#1a2332]">Kamus Pekerjaan</CardTitle>
                  <Button onClick={() => openKamusModal()} className="bg-[#1a7a8a] text-white hover:bg-[#1a7a8a]/90">
                    Add Kamus
                  </Button>
                </CardHeader>
                <CardContent>
                  {kamusLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-[#1a7a8a]" />
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Kategori</TableHead>
                          <TableHead>Jenis</TableHead>
                          <TableHead>Jam Standar</TableHead>
                          <TableHead>Aktif</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {kamusList.map((kamus, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{kamus.kategoriPekerjaan}</TableCell>
                            <TableCell>{kamus.jenisPekerjaan}</TableCell>
                            <TableCell>{Number(kamus.jamStandar)}</TableCell>
                            <TableCell>{kamus.aktif ? '✓' : '✗'}</TableCell>
                            <TableCell>
                              <Button onClick={() => openKamusModal(kamus)} size="sm" variant="outline">
                                Edit
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            )}

            {masterDataSection === 'aturan' && (
              <Card className="bg-[#f5f0e8] border-[#8b7355]">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-[#1a2332]">Aturan Beban Perusahaan</CardTitle>
                  <Button onClick={() => openAturanModal()} className="bg-[#1a7a8a] text-white hover:bg-[#1a7a8a]/90">
                    Add Aturan
                  </Button>
                </CardHeader>
                <CardContent>
                  {aturanLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-[#1a7a8a]" />
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tipe Partner</TableHead>
                          <TableHead>Jam Min</TableHead>
                          <TableHead>Jam Max</TableHead>
                          <TableHead>Pola Beban</TableHead>
                          <TableHead>Nilai</TableHead>
                          <TableHead>Aktif</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {aturanList.map((aturan, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{aturan.tipePartner}</TableCell>
                            <TableCell>{Number(aturan.jamMin)}</TableCell>
                            <TableCell>{Number(aturan.jamMax)}</TableCell>
                            <TableCell>{aturan.polaBeban}</TableCell>
                            <TableCell>{Number(aturan.nilai)}</TableCell>
                            <TableCell>{aturan.aktif ? '✓' : '✗'}</TableCell>
                            <TableCell>
                              <Button onClick={() => openAturanModal(aturan)} size="sm" variant="outline">
                                Edit
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            )}

            {masterDataSection === 'konstanta' && (
              <Card className="bg-[#f5f0e8] border-[#8b7355]">
                <CardHeader>
                  <CardTitle className="text-[#1a2332]">Konstanta Unit Client</CardTitle>
                </CardHeader>
                <CardContent>
                  {konstantaLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-[#1a7a8a]" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="konstantaValue">Unit ke Jam Perusahaan</Label>
                        <Input
                          id="konstantaValue"
                          type="number"
                          value={konstantaValue}
                          onChange={(e) => setKonstantaValue(e.target.value)}
                          className="max-w-xs"
                        />
                      </div>
                      <Button onClick={handleSaveKonstanta} className="bg-[#1a7a8a] text-white hover:bg-[#1a7a8a]/90">
                        Save Konstanta
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'rates' && (
          <Card className="bg-[#f5f0e8] border-[#8b7355]">
            <CardHeader>
              <CardTitle className="text-[#1a2332]">Partner Rates (Reference Only)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-w-md">
                <div>
                  <Label htmlFor="rateJunior">Junior Rate (Rp/hour)</Label>
                  <Input
                    id="rateJunior"
                    type="number"
                    value={ratesData.junior}
                    onChange={(e) => setRatesData(prev => ({ ...prev, junior: e.target.value }))}
                    disabled
                  />
                </div>
                <div>
                  <Label htmlFor="rateSenior">Senior Rate (Rp/hour)</Label>
                  <Input
                    id="rateSenior"
                    type="number"
                    value={ratesData.senior}
                    onChange={(e) => setRatesData(prev => ({ ...prev, senior: e.target.value }))}
                    disabled
                  />
                </div>
                <div>
                  <Label htmlFor="rateExpert">Expert Rate (Rp/hour)</Label>
                  <Input
                    id="rateExpert"
                    type="number"
                    value={ratesData.expert}
                    onChange={(e) => setRatesData(prev => ({ ...prev, expert: e.target.value }))}
                    disabled
                  />
                </div>
                <p className="text-sm text-[#4a5568]">These rates are for reference only and cannot be modified from this interface.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'tasks' && (
          <Card className="bg-[#f5f0e8] border-[#8b7355]">
            <CardHeader>
              <CardTitle className="text-[#1a2332]">Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[#4a5568]">{tasksMessage}</p>
            </CardContent>
          </Card>
        )}

        {activeTab === 'layanan' && (
          <div className="space-y-6">
            <Card className="bg-[#f5f0e8] border-[#8b7355]">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-[#1a2332]">Layanan V4</CardTitle>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="showArchived"
                      checked={showArchived}
                      onCheckedChange={(checked) => setShowArchived(checked === true)}
                    />
                    <Label htmlFor="showArchived" className="text-sm text-[#1a2332]">Show Archived</Label>
                  </div>
                  <Button onClick={() => setCreateModalOpen(true)} className="bg-[#1a7a8a] text-white hover:bg-[#1a7a8a]/90">
                    Create Layanan
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {layananLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-[#1a7a8a]" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Units</TableHead>
                        <TableHead>Price/Unit</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {layananList.map(layanan => (
                        <TableRow key={layanan.id}>
                          <TableCell className="font-mono text-sm">{layanan.id}</TableCell>
                          <TableCell className="font-mono text-xs">{layanan.clientPrincipal.toString().slice(0, 15)}...</TableCell>
                          <TableCell>{layanan.tipe}</TableCell>
                          <TableCell>{Number(layanan.unitUsed)} / {Number(layanan.unitTotal)}</TableCell>
                          <TableCell>Rp {Number(layanan.hargaPerUnit).toLocaleString('id-ID')}</TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <span className={`text-xs ${layanan.isActive ? 'text-green-600' : 'text-gray-500'}`}>
                                {layanan.isActive ? 'Active' : 'Inactive'}
                              </span>
                              {layanan.isArchived && <span className="text-xs text-red-600">Archived</span>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button onClick={() => openEditModal(layanan)} size="sm" variant="outline">
                                Edit
                              </Button>
                              {!layanan.isArchived && (
                                <>
                                  <Button
                                    onClick={() => handleToggleActive(layanan.id, layanan.isActive)}
                                    size="sm"
                                    variant="outline"
                                  >
                                    {layanan.isActive ? 'Deactivate' : 'Activate'}
                                  </Button>
                                  {archiveConfirmId === layanan.id ? (
                                    <div className="flex gap-1">
                                      <Button
                                        onClick={() => handleArchive(layanan.id)}
                                        size="sm"
                                        variant="destructive"
                                      >
                                        Confirm
                                      </Button>
                                      <Button
                                        onClick={() => setArchiveConfirmId(null)}
                                        size="sm"
                                        variant="outline"
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  ) : (
                                    <Button
                                      onClick={() => setArchiveConfirmId(layanan.id)}
                                      size="sm"
                                      variant="destructive"
                                    >
                                      Archive
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#1a2332]/90 backdrop-blur-sm border-t border-[#8b7355]/30 py-4 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-[#f5f0e8]">
          Asistenku © {new Date().getFullYear()} PT. Asistenku Digital Indonesia
        </div>
      </footer>

      {/* Skill Modal */}
      <Dialog open={skillModalOpen} onOpenChange={setSkillModalOpen}>
        <DialogContent className="bg-[#f5f0e8]">
          <DialogHeader>
            <DialogTitle>{editingSkill ? 'Edit Skill' : 'Add Skill'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="skillNama">Nama</Label>
              <Input
                id="skillNama"
                value={skillForm.nama}
                onChange={(e) => setSkillForm(prev => ({ ...prev, nama: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="skillKategori">Kategori</Label>
              <Input
                id="skillKategori"
                value={skillForm.kategori}
                onChange={(e) => setSkillForm(prev => ({ ...prev, kategori: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="skillAktif"
                checked={skillForm.aktif}
                onCheckedChange={(checked) => setSkillForm(prev => ({ ...prev, aktif: checked === true }))}
              />
              <Label htmlFor="skillAktif">Aktif</Label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveSkill} className="bg-[#1a7a8a] text-white hover:bg-[#1a7a8a]/90">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Kamus Modal */}
      <Dialog open={kamusModalOpen} onOpenChange={setKamusModalOpen}>
        <DialogContent className="bg-[#f5f0e8]">
          <DialogHeader>
            <DialogTitle>{editingKamus ? 'Edit Kamus' : 'Add Kamus'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="kamusKategori">Kategori Pekerjaan</Label>
              <Input
                id="kamusKategori"
                value={kamusForm.kategoriPekerjaan}
                onChange={(e) => setKamusForm(prev => ({ ...prev, kategoriPekerjaan: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="kamusJenis">Jenis Pekerjaan</Label>
              <Input
                id="kamusJenis"
                value={kamusForm.jenisPekerjaan}
                onChange={(e) => setKamusForm(prev => ({ ...prev, jenisPekerjaan: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="kamusJam">Jam Standar</Label>
              <Input
                id="kamusJam"
                type="number"
                value={kamusForm.jamStandar}
                onChange={(e) => setKamusForm(prev => ({ ...prev, jamStandar: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="kamusAktif"
                checked={kamusForm.aktif}
                onCheckedChange={(checked) => setKamusForm(prev => ({ ...prev, aktif: checked === true }))}
              />
              <Label htmlFor="kamusAktif">Aktif</Label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveKamus} className="bg-[#1a7a8a] text-white hover:bg-[#1a7a8a]/90">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Aturan Modal */}
      <Dialog open={aturanModalOpen} onOpenChange={setAturanModalOpen}>
        <DialogContent className="bg-[#f5f0e8]">
          <DialogHeader>
            <DialogTitle>{editingAturan ? 'Edit Aturan' : 'Add Aturan'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="aturanTipe">Tipe Partner</Label>
              <Select
                value={aturanForm.tipePartner}
                onValueChange={(value) => setAturanForm(prev => ({ ...prev, tipePartner: value as TipePartner }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TipePartner.junior}>Junior</SelectItem>
                  <SelectItem value={TipePartner.senior}>Senior</SelectItem>
                  <SelectItem value={TipePartner.expert}>Expert</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="aturanJamMin">Jam Min</Label>
              <Input
                id="aturanJamMin"
                type="number"
                value={aturanForm.jamMin}
                onChange={(e) => setAturanForm(prev => ({ ...prev, jamMin: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="aturanJamMax">Jam Max</Label>
              <Input
                id="aturanJamMax"
                type="number"
                value={aturanForm.jamMax}
                onChange={(e) => setAturanForm(prev => ({ ...prev, jamMax: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="aturanPola">Pola Beban</Label>
              <Select
                value={aturanForm.polaBeban}
                onValueChange={(value) => setAturanForm(prev => ({ ...prev, polaBeban: value as Variant_TAMBAH_PER_JAM_TAMBAH_JAM_TETAP }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={Variant_TAMBAH_PER_JAM_TAMBAH_JAM_TETAP.TAMBAH_JAM_TETAP}>TAMBAH_JAM_TETAP</SelectItem>
                  <SelectItem value={Variant_TAMBAH_PER_JAM_TAMBAH_JAM_TETAP.TAMBAH_PER_JAM}>TAMBAH_PER_JAM</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="aturanNilai">Nilai</Label>
              <Input
                id="aturanNilai"
                type="number"
                value={aturanForm.nilai}
                onChange={(e) => setAturanForm(prev => ({ ...prev, nilai: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="aturanAktif"
                checked={aturanForm.aktif}
                onCheckedChange={(checked) => setAturanForm(prev => ({ ...prev, aktif: checked === true }))}
              />
              <Label htmlFor="aturanAktif">Aktif</Label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveAturan} className="bg-[#1a7a8a] text-white hover:bg-[#1a7a8a]/90">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Layanan Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="bg-[#f5f0e8] max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Layanan V4</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="createClient">Client Principal</Label>
              <Input
                id="createClient"
                value={createForm.clientPrincipal}
                onChange={(e) => setCreateForm(prev => ({ ...prev, clientPrincipal: e.target.value }))}
                placeholder="Enter client principal"
              />
            </div>
            <div>
              <Label htmlFor="createTipe">Type</Label>
              <Select
                value={createForm.tipe}
                onValueChange={(value) => setCreateForm(prev => ({ ...prev, tipe: value as LayananTypeV4 }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={LayananTypeV4.TENANG}>TENANG</SelectItem>
                  <SelectItem value={LayananTypeV4.RAPI}>RAPI</SelectItem>
                  <SelectItem value={LayananTypeV4.FOKUS}>FOKUS</SelectItem>
                  <SelectItem value={LayananTypeV4.JAGA}>JAGA</SelectItem>
                  <SelectItem value={LayananTypeV4.EFEKTIF}>EFEKTIF</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="createUnitTotal">Unit Total</Label>
              <Input
                id="createUnitTotal"
                type="number"
                value={createForm.unitTotal}
                onChange={(e) => setCreateForm(prev => ({ ...prev, unitTotal: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="createHarga">Harga Per Unit</Label>
              <Input
                id="createHarga"
                type="number"
                value={createForm.hargaPerUnit}
                onChange={(e) => setCreateForm(prev => ({ ...prev, hargaPerUnit: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="createAsistenmu">Asistenmu Principal</Label>
              <Input
                id="createAsistenmu"
                value={createForm.asistenmuPrincipal}
                onChange={(e) => setCreateForm(prev => ({ ...prev, asistenmuPrincipal: e.target.value }))}
                placeholder="Enter asistenmu principal"
              />
            </div>
            <div>
              <Label htmlFor="createShared">Shared With (one principal per line)</Label>
              <Textarea
                id="createShared"
                value={createForm.sharedWith}
                onChange={(e) => setCreateForm(prev => ({ ...prev, sharedWith: e.target.value }))}
                placeholder="Enter principals, one per line"
                rows={3}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="createActive"
                checked={createForm.isActive}
                onCheckedChange={(checked) => setCreateForm(prev => ({ ...prev, isActive: checked === true }))}
              />
              <Label htmlFor="createActive">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCreate} className="bg-[#1a7a8a] text-white hover:bg-[#1a7a8a]/90">
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Layanan Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="bg-[#f5f0e8] max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Layanan V4</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editClient">Client Principal</Label>
              <Input
                id="editClient"
                value={editForm.clientPrincipal}
                onChange={(e) => setEditForm(prev => ({ ...prev, clientPrincipal: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="editTipe">Type</Label>
              <Select
                value={editForm.tipe}
                onValueChange={(value) => setEditForm(prev => ({ ...prev, tipe: value as LayananTypeV4 }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={LayananTypeV4.TENANG}>TENANG</SelectItem>
                  <SelectItem value={LayananTypeV4.RAPI}>RAPI</SelectItem>
                  <SelectItem value={LayananTypeV4.FOKUS}>FOKUS</SelectItem>
                  <SelectItem value={LayananTypeV4.JAGA}>JAGA</SelectItem>
                  <SelectItem value={LayananTypeV4.EFEKTIF}>EFEKTIF</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="editUnitTotal">Unit Total</Label>
              <Input
                id="editUnitTotal"
                type="number"
                value={editForm.unitTotal}
                onChange={(e) => setEditForm(prev => ({ ...prev, unitTotal: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="editHarga">Harga Per Unit</Label>
              <Input
                id="editHarga"
                type="number"
                value={editForm.hargaPerUnit}
                onChange={(e) => setEditForm(prev => ({ ...prev, hargaPerUnit: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="editAsistenmu">Asistenmu Principal</Label>
              <Input
                id="editAsistenmu"
                value={editForm.asistenmuPrincipal}
                onChange={(e) => setEditForm(prev => ({ ...prev, asistenmuPrincipal: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="editShared">Shared With (one principal per line)</Label>
              <Textarea
                id="editShared"
                value={editForm.sharedWith}
                onChange={(e) => setEditForm(prev => ({ ...prev, sharedWith: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="editActive"
                checked={editForm.isActive}
                onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, isActive: checked === true }))}
              />
              <Label htmlFor="editActive">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleEdit} className="bg-[#1a7a8a] text-white hover:bg-[#1a7a8a]/90">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
