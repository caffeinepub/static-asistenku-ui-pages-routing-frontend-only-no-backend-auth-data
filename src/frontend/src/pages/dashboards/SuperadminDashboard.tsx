import { useState, useEffect } from 'react';
import { useInternetIdentity } from '../../hooks/useInternetIdentity';
import { useActor } from '../../hooks/useActor';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Loader2, RefreshCw, AlertCircle, Search, ChevronDown, ChevronRight, Plus, Trash2, Edit } from 'lucide-react';
import type { UserStatus, TipePartner, AturanBebanPerusahaan, KamusPekerjaan, KonstantaUnitClient, Task, UserRole, ClientProfile, PartnerProfile, InternalProfile, TaskPhase, Variant_TAMBAH_PER_JAM_TAMBAH_JAM_TETAP } from '../../backend';
import { Principal } from '@dfinity/principal';

// Helper functions
function safeString(value: unknown): string {
  if (value === null || value === undefined) return '-';
  return String(value);
}

function countArray(arr: unknown): number {
  if (!arr || !Array.isArray(arr)) return 0;
  return arr.length;
}

function roleKeyFromVariant(roleEntry: unknown): string {
  if (!roleEntry || typeof roleEntry !== 'object') return '-';
  const obj = roleEntry as Record<string, unknown>;
  
  if ('__kind__' in obj) {
    return safeString(obj.__kind__);
  }
  
  const keys = Object.keys(obj);
  if (keys.length > 0) return keys[0];
  return '-';
}

function formatUserStatus(status: UserStatus): string {
  return String(status);
}

function formatTipePartner(tipe: TipePartner): string {
  return String(tipe);
}

function formatTimestamp(timestamp: bigint | undefined | null): string {
  if (!timestamp) return '-';
  try {
    const ms = Number(timestamp) / 1_000_000;
    return new Date(ms).toLocaleString();
  } catch {
    return '-';
  }
}

function formatPolaBeban(pola: Variant_TAMBAH_PER_JAM_TAMBAH_JAM_TETAP): string {
  return String(pola);
}

function parseNatToBigInt(value: string): { value?: bigint; error?: string } {
  if (!value || value.trim() === '') {
    return { error: 'Value is required' };
  }
  try {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 0) {
      return { error: 'Must be a positive number' };
    }
    return { value: BigInt(num) };
  } catch {
    return { error: 'Invalid number' };
  }
}

type TabName = 'ringkasan' | 'users' | 'masterdata' | 'rates' | 'tasks';

interface RingkasanData {
  totalUsers: number;
  masterDataKeys: number;
  rates: [bigint, bigint, bigint] | null;
  usersBreakdown?: Array<[any, string, string, UserStatus]>;
}

interface UsersData {
  users: Array<[any, string, string, UserStatus]>;
}

interface MasterDataData {
  masterDataMap: Array<[string, string]> | null;
  kamusPekerjaan: KamusPekerjaan[];
  aturanBeban: AturanBebanPerusahaan[];
  konstanta: KonstantaUnitClient | null;
}

interface RatesData {
  rates: [bigint, bigint, bigint] | null;
  juniorRate: bigint | null;
  seniorRate: bigint | null;
  expertRate: bigint | null;
}

interface TasksData {
  tasks: Task[];
}

interface EnrichedUser {
  principal: Principal;
  userId: string;
  role: string;
  status: UserStatus;
  name?: string;
  email?: string;
  whatsapp?: string;
  company?: string;
  keahlian?: string;
  domisili?: string;
  partnerLevel?: TipePartner;
  internalRole?: string;
}

type DetailModalMode = 'view' | 'edit';

export default function SuperadminDashboard() {
  const { identity, clear } = useInternetIdentity();
  const { actor, isFetching: actorFetching } = useActor();
  const [activeTab, setActiveTab] = useState<TabName>('ringkasan');

  // Tab-specific state
  const [ringkasanData, setRingkasanData] = useState<RingkasanData | null>(null);
  const [ringkasanLoading, setRingkasanLoading] = useState(false);
  const [ringkasanError, setRingkasanError] = useState<string | null>(null);

  const [usersData, setUsersData] = useState<UsersData | null>(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);

  const [masterDataData, setMasterDataData] = useState<MasterDataData | null>(null);
  const [masterDataLoading, setMasterDataLoading] = useState(false);
  const [masterDataError, setMasterDataError] = useState<string | null>(null);

  const [ratesData, setRatesData] = useState<RatesData | null>(null);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);

  const [tasksData, setTasksData] = useState<TasksData | null>(null);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksError, setTasksError] = useState<string | null>(null);

  // Users tab specific state
  const [searchQuery, setSearchQuery] = useState('');
  const [enrichedUsers, setEnrichedUsers] = useState<EnrichedUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<EnrichedUser | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailModalMode, setDetailModalMode] = useState<DetailModalMode>('view');
  const [editFormData, setEditFormData] = useState<any>({});
  const [originalFormData, setOriginalFormData] = useState<any>({});
  const [updateLoading, setUpdateLoading] = useState(false);

  // Search pagination state
  const [searchPage, setSearchPage] = useState(1);
  const SEARCH_PAGE_SIZE = 5;

  // Collapsible state for Users tab
  const [pendingUsersExpanded, setPendingUsersExpanded] = useState(true);
  const [clientExpanded, setClientExpanded] = useState(false);
  const [partnerExpanded, setPartnerExpanded] = useState(false);
  const [internalExpanded, setInternalExpanded] = useState(false);

  // Subsection collapsible state
  const [clientActiveExpanded, setClientActiveExpanded] = useState(true);
  const [clientSuspendedExpanded, setClientSuspendedExpanded] = useState(true);
  const [clientBlacklistedExpanded, setClientBlacklistedExpanded] = useState(true);

  const [partnerActiveExpanded, setPartnerActiveExpanded] = useState(true);
  const [partnerPendingExpanded, setPartnerPendingExpanded] = useState(true);
  const [partnerSuspendedExpanded, setPartnerSuspendedExpanded] = useState(true);
  const [partnerBlacklistedExpanded, setPartnerBlacklistedExpanded] = useState(true);

  const [internalActiveExpanded, setInternalActiveExpanded] = useState(true);
  const [internalPendingExpanded, setInternalPendingExpanded] = useState(true);

  // Ringkasan collapsible state
  const [totalUsersExpanded, setTotalUsersExpanded] = useState(false);
  const [asistenkuServicesExpanded, setAsistenkuServicesExpanded] = useState(false);
  const [tasksRingkasanExpanded, setTasksRingkasanExpanded] = useState(false);
  const [financialExpanded, setFinancialExpanded] = useState(false);
  const [masterDataRingkasanExpanded, setMasterDataRingkasanExpanded] = useState(false);

  // Master Data section-specific state
  const [mdMapData, setMdMapData] = useState<Array<[string, string]> | null>(null);
  const [mdMapLoading, setMdMapLoading] = useState(false);
  const [mdMapError, setMdMapError] = useState<string | null>(null);
  const [mdMapExpanded, setMdMapExpanded] = useState(true);
  const [mdMapKey, setMdMapKey] = useState('');
  const [mdMapValue, setMdMapValue] = useState('');
  const [mdMapEditMode, setMdMapEditMode] = useState(false);
  const [mdMapEditingKey, setMdMapEditingKey] = useState('');

  const [kamusData, setKamusData] = useState<KamusPekerjaan[]>([]);
  const [kamusLoading, setKamusLoading] = useState(false);
  const [kamusError, setKamusError] = useState<string | null>(null);
  const [kamusExpanded, setKamusExpanded] = useState(true);
  const [kamusModalOpen, setKamusModalOpen] = useState(false);
  const [kamusFormData, setKamusFormData] = useState<any>({});
  const [kamusFormErrors, setKamusFormErrors] = useState<any>({});
  const [kamusShowArchived, setKamusShowArchived] = useState(false);
  const [kamusEditMode, setKamusEditMode] = useState(false);
  const [kamusEditingIndex, setKamusEditingIndex] = useState<number | null>(null);

  const [aturanData, setAturanData] = useState<AturanBebanPerusahaan[]>([]);
  const [aturanLoading, setAturanLoading] = useState(false);
  const [aturanError, setAturanError] = useState<string | null>(null);
  const [aturanExpanded, setAturanExpanded] = useState(true);
  const [aturanModalOpen, setAturanModalOpen] = useState(false);
  const [aturanFormData, setAturanFormData] = useState<any>({});
  const [aturanFormErrors, setAturanFormErrors] = useState<any>({});
  const [aturanShowArchived, setAturanShowArchived] = useState(false);
  const [aturanEditMode, setAturanEditMode] = useState(false);
  const [aturanEditingIndex, setAturanEditingIndex] = useState<number | null>(null);

  const [konstantaData, setKonstantaData] = useState<KonstantaUnitClient | null>(null);
  const [konstantaLoading, setKonstantaLoading] = useState(false);
  const [konstantaError, setKonstantaError] = useState<string | null>(null);
  const [konstantaExpanded, setKonstantaExpanded] = useState(true);
  const [konstantaInput, setKonstantaInput] = useState('');
  const [konstantaInputError, setKonstantaInputError] = useState('');

  // Saving guards for Master Data mutations
  const [kamusSaving, setKamusSaving] = useState(false);
  const [aturanSaving, setAturanSaving] = useState(false);
  const [mapSaving, setMapSaving] = useState(false);
  const [konstantaSaving, setKonstantaSaving] = useState(false);

  const isAnonymous = !identity;

  // Fetch functions
  const fetchRingkasan = async () => {
    if (!actor || isAnonymous) return;
    
    setRingkasanLoading(true);
    setRingkasanError(null);
    
    try {
      const [usersResult, masterDataResult, ratesResult, kamusResult, aturanResult, konstantaResult] = await Promise.all([
        actor.listUsersBasic('').catch(() => []),
        actor.getMasterDataMap().catch(() => null),
        actor.getRates().catch(() => null),
        actor.listKamusPekerjaan().catch(() => []),
        actor.listAturanBeban().catch(() => []),
        actor.getKonstantaUnitClient().catch(() => null),
      ]);

      setRingkasanData({
        totalUsers: countArray(usersResult),
        masterDataKeys: countArray(masterDataResult),
        rates: ratesResult,
        usersBreakdown: usersResult,
      });

      // Update Master Data state for Ringkasan counts
      setMasterDataData({
        masterDataMap: masterDataResult,
        kamusPekerjaan: kamusResult,
        aturanBeban: aturanResult,
        konstanta: konstantaResult,
      });

      // Update individual section states
      setMdMapData(masterDataResult);
      setKamusData(kamusResult);
      setAturanData(aturanResult);
      setKonstantaData(konstantaResult);
    } catch (error: any) {
      setRingkasanError(error?.message || 'Failed to load summary data');
    } finally {
      setRingkasanLoading(false);
    }
  };

  const fetchUsers = async () => {
    if (!actor || isAnonymous) return;
    
    setUsersLoading(true);
    setUsersError(null);
    
    try {
      const result = await actor.listUsersBasic('');
      setUsersData({ users: result });

      // Enrich user data
      const enriched: EnrichedUser[] = [];
      for (const [principal, userId, role, status] of result) {
        const enrichedUser: EnrichedUser = {
          principal,
          userId,
          role,
          status,
        };

        try {
          const profile = await actor.getUserProfile(principal);
          if (profile) {
            if ('__kind__' in profile) {
              const kind = profile.__kind__;
              if (kind === 'client' && 'client' in profile) {
                const clientProfile = profile.client as ClientProfile;
                enrichedUser.name = clientProfile.name;
                enrichedUser.email = clientProfile.email;
                enrichedUser.whatsapp = clientProfile.whatsapp;
                enrichedUser.company = clientProfile.company;
              } else if (kind === 'partner' && 'partner' in profile) {
                const partnerProfile = profile.partner as PartnerProfile;
                enrichedUser.name = partnerProfile.name;
                enrichedUser.email = partnerProfile.email;
                enrichedUser.whatsapp = partnerProfile.whatsapp;
                enrichedUser.keahlian = partnerProfile.keahlian;
                enrichedUser.domisili = partnerProfile.domisili;
                try {
                  const level = await actor.getPartnerLevel(principal);
                  enrichedUser.partnerLevel = level;
                } catch {}
              } else if (kind === 'internal' && 'internal' in profile) {
                const internalProfile = profile.internal as InternalProfile;
                enrichedUser.name = internalProfile.name;
                enrichedUser.email = internalProfile.email;
                enrichedUser.whatsapp = internalProfile.whatsapp;
                enrichedUser.internalRole = internalProfile.role;
              }
            }
          }
        } catch {}

        enriched.push(enrichedUser);
      }

      setEnrichedUsers(enriched);
    } catch (error: any) {
      setUsersError(error?.message || 'Failed to load users data');
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchMasterData = async () => {
    if (!actor || isAnonymous) return;
    
    setMasterDataLoading(true);
    setMasterDataError(null);
    
    try {
      const [masterDataResult, kamusResult, aturanResult, konstantaResult] = await Promise.all([
        actor.getMasterDataMap().catch(() => null),
        actor.listKamusPekerjaan().catch(() => []),
        actor.listAturanBeban().catch(() => []),
        actor.getKonstantaUnitClient().catch(() => null),
      ]);

      setMasterDataData({
        masterDataMap: masterDataResult,
        kamusPekerjaan: kamusResult,
        aturanBeban: aturanResult,
        konstanta: konstantaResult,
      });

      // Update individual section states
      setMdMapData(masterDataResult);
      setKamusData(kamusResult);
      setAturanData(aturanResult);
      setKonstantaData(konstantaResult);
    } catch (error: any) {
      setMasterDataError(error?.message || 'Failed to load master data');
    } finally {
      setMasterDataLoading(false);
    }
  };

  const fetchRates = async () => {
    if (!actor || isAnonymous) return;
    
    setRatesLoading(true);
    setRatesError(null);
    
    try {
      const [ratesResult, juniorResult, seniorResult, expertResult] = await Promise.all([
        actor.getRates().catch(() => null),
        actor.getHourlyRateByLevel('junior' as TipePartner).catch(() => null),
        actor.getHourlyRateByLevel('senior' as TipePartner).catch(() => null),
        actor.getHourlyRateByLevel('expert' as TipePartner).catch(() => null),
      ]);

      setRatesData({
        rates: ratesResult,
        juniorRate: juniorResult,
        seniorRate: seniorResult,
        expertRate: expertResult,
      });
    } catch (error: any) {
      setRatesError(error?.message || 'Failed to load rates data');
    } finally {
      setRatesLoading(false);
    }
  };

  const fetchTasks = async () => {
    if (!actor || isAnonymous) return;
    
    setTasksLoading(true);
    setTasksError(null);
    
    try {
      const result = await actor.listMyTasks();
      setTasksData({ tasks: result });
    } catch (error: any) {
      setTasksError(error?.message || 'Failed to load tasks data');
    } finally {
      setTasksLoading(false);
    }
  };

  // Master Data section-specific fetch functions
  const fetchMdMap = async () => {
    if (!actor || isAnonymous) return;
    setMdMapLoading(true);
    setMdMapError(null);
    try {
      const result = await actor.getMasterDataMap();
      setMdMapData(result);
    } catch (error: any) {
      setMdMapError(error?.message || 'Failed to load master data map');
    } finally {
      setMdMapLoading(false);
    }
  };

  const fetchKamus = async () => {
    if (!actor || isAnonymous) return;
    setKamusLoading(true);
    setKamusError(null);
    try {
      const result = await actor.listKamusPekerjaan();
      setKamusData(result);
    } catch (error: any) {
      setKamusError(error?.message || 'Failed to load kamus pekerjaan');
    } finally {
      setKamusLoading(false);
    }
  };

  const fetchAturan = async () => {
    if (!actor || isAnonymous) return;
    setAturanLoading(true);
    setAturanError(null);
    try {
      const result = await actor.listAturanBeban();
      setAturanData(result);
    } catch (error: any) {
      setAturanError(error?.message || 'Failed to load aturan beban');
    } finally {
      setAturanLoading(false);
    }
  };

  const fetchKonstanta = async () => {
    if (!actor || isAnonymous) return;
    setKonstantaLoading(true);
    setKonstantaError(null);
    try {
      const result = await actor.getKonstantaUnitClient();
      setKonstantaData(result);
    } catch (error: any) {
      setKonstantaError(error?.message || 'Failed to load konstanta');
    } finally {
      setKonstantaLoading(false);
    }
  };

  // Auto-load Ringkasan on mount when logged in
  useEffect(() => {
    if (actor && !isAnonymous && !actorFetching && activeTab === 'ringkasan' && !ringkasanData) {
      fetchRingkasan();
    }
  }, [actor, isAnonymous, actorFetching, activeTab]);

  // Handle tab change
  const handleTabChange = (value: string) => {
    const tab = value as TabName;
    setActiveTab(tab);
    
    if (isAnonymous || !actor) return;
    
    // Auto-load data for the selected tab if not already loaded
    if (tab === 'ringkasan' && !ringkasanData && !ringkasanLoading) {
      fetchRingkasan();
    } else if (tab === 'users' && !usersData && !usersLoading) {
      fetchUsers();
    } else if (tab === 'masterdata' && !masterDataData && !masterDataLoading) {
      fetchMasterData();
    } else if (tab === 'rates' && !ratesData && !ratesLoading) {
      fetchRates();
    } else if (tab === 'tasks' && !tasksData && !tasksLoading) {
      fetchTasks();
    }
  };

  // Handle logout
  const handleLogout = async () => {
    await clear();
    window.location.href = '/';
  };

  // User detail modal handlers
  const openUserDetail = (user: EnrichedUser) => {
    setSelectedUser(user);
    setDetailModalMode('view');
    setDetailModalOpen(true);
  };

  const handleEditUser = () => {
    if (!selectedUser) return;
    
    const formData: any = {
      status: selectedUser.status,
    };

    if (selectedUser.role === 'partner' && selectedUser.partnerLevel) {
      formData.partnerLevel = selectedUser.partnerLevel;
    }

    setEditFormData(formData);
    setOriginalFormData({ ...formData });
    setDetailModalMode('edit');
  };

  const handleCancelEdit = () => {
    setEditFormData({});
    setOriginalFormData({});
    setDetailModalMode('view');
  };

  const handleUpdateUser = async () => {
    if (!selectedUser || !actor) return;

    setUpdateLoading(true);
    try {
      // Update status if changed
      if (editFormData.status !== originalFormData.status) {
        await actor.setUserStatus(selectedUser.principal, editFormData.status);
      }

      // Update partner level if changed
      if (selectedUser.role === 'partner' && editFormData.partnerLevel !== originalFormData.partnerLevel) {
        await actor.setPartnerLevel(selectedUser.principal, editFormData.partnerLevel);
      }

      // Refresh users data
      await fetchUsers();

      // Update selected user
      const updatedUser = enrichedUsers.find(u => u.principal.toString() === selectedUser.principal.toString());
      if (updatedUser) {
        setSelectedUser(updatedUser);
      }

      setDetailModalMode('view');
      setEditFormData({});
      setOriginalFormData({});
    } catch (error: any) {
      alert(`Failed to update user: ${error?.message || 'Unknown error'}`);
    } finally {
      setUpdateLoading(false);
    }
  };

  // Master Data Map handlers
  const handleSaveMdMap = async () => {
    if (!actor || mapSaving) return;
    if (!mdMapKey.trim() || !mdMapValue.trim()) {
      alert('Key and value are required');
      return;
    }

    setMapSaving(true);
    try {
      await actor.pushMasterData(mdMapKey, mdMapValue);
      await fetchMdMap();
      setMdMapKey('');
      setMdMapValue('');
      setMdMapEditMode(false);
      setMdMapEditingKey('');
    } catch (error: any) {
      alert(`Failed to save: ${error?.message || 'Unknown error'}`);
    } finally {
      setMapSaving(false);
    }
  };

  const handleEditMdMap = (key: string, value: string) => {
    setMdMapKey(key);
    setMdMapValue(value);
    setMdMapEditMode(true);
    setMdMapEditingKey(key);
  };

  const handleCancelMdMapEdit = () => {
    setMdMapKey('');
    setMdMapValue('');
    setMdMapEditMode(false);
    setMdMapEditingKey('');
  };

  const handleDeleteMdMap = async (key: string) => {
    if (!actor || mapSaving) return;
    if (!confirm(`Delete key "${key}"?`)) return;

    setMapSaving(true);
    try {
      await actor.pushMasterData(key, '');
      await fetchMdMap();
    } catch (error: any) {
      alert(`Failed to delete: ${error?.message || 'Unknown error'}`);
    } finally {
      setMapSaving(false);
    }
  };

  // Kamus Pekerjaan handlers
  const openKamusModal = (editIndex: number | null = null) => {
    if (editIndex !== null) {
      const item = kamusData[editIndex];
      setKamusFormData({
        kategoriPekerjaan: item.kategoriPekerjaan,
        jenisPekerjaan: item.jenisPekerjaan,
        jamStandar: item.jamStandar.toString(),
        tipePartnerBoleh: item.tipePartnerBoleh,
        aktif: item.aktif,
      });
      setKamusEditMode(true);
      setKamusEditingIndex(editIndex);
    } else {
      setKamusFormData({
        kategoriPekerjaan: '',
        jenisPekerjaan: '',
        jamStandar: '',
        tipePartnerBoleh: [],
        aktif: true,
      });
      setKamusEditMode(false);
      setKamusEditingIndex(null);
    }
    setKamusFormErrors({});
    setKamusModalOpen(true);
  };

  const closeKamusModal = () => {
    setKamusModalOpen(false);
    setKamusFormData({});
    setKamusFormErrors({});
    setKamusEditMode(false);
    setKamusEditingIndex(null);
  };

  const handleSaveKamus = async () => {
    if (!actor || kamusSaving) return;

    const errors: any = {};
    if (!kamusFormData.kategoriPekerjaan?.trim()) errors.kategoriPekerjaan = 'Required';
    if (!kamusFormData.jenisPekerjaan?.trim()) errors.jenisPekerjaan = 'Required';
    if (!kamusFormData.jamStandar?.trim()) errors.jamStandar = 'Required';
    if (!kamusFormData.tipePartnerBoleh || kamusFormData.tipePartnerBoleh.length === 0) {
      errors.tipePartnerBoleh = 'At least one type required';
    }

    if (Object.keys(errors).length > 0) {
      setKamusFormErrors(errors);
      return;
    }

    const parsed = parseNatToBigInt(kamusFormData.jamStandar);
    if (parsed.error) {
      setKamusFormErrors({ jamStandar: parsed.error });
      return;
    }

    setKamusSaving(true);
    try {
      const kodeOpt = kamusEditMode && kamusEditingIndex !== null 
        ? `KMS-${String(kamusEditingIndex + 1).padStart(4, '0')}`
        : null;

      await actor.upsertKamusPekerjaan(
        kodeOpt,
        kamusFormData.kategoriPekerjaan,
        kamusFormData.jenisPekerjaan,
        parsed.value!,
        kamusFormData.tipePartnerBoleh,
        kamusFormData.aktif
      );

      await fetchKamus();
      closeKamusModal();
    } catch (error: any) {
      alert(`Failed to save: ${error?.message || 'Unknown error'}`);
    } finally {
      setKamusSaving(false);
    }
  };

  const handleArchiveKamus = async (index: number) => {
    if (!actor || kamusSaving) return;
    if (!confirm('Archive this item?')) return;

    const item = kamusData[index];
    setKamusSaving(true);
    try {
      const kode = `KMS-${String(index + 1).padStart(4, '0')}`;
      await actor.upsertKamusPekerjaan(
        kode,
        item.kategoriPekerjaan,
        item.jenisPekerjaan,
        item.jamStandar,
        item.tipePartnerBoleh,
        false
      );
      await fetchKamus();
    } catch (error: any) {
      alert(`Failed to archive: ${error?.message || 'Unknown error'}`);
    } finally {
      setKamusSaving(false);
    }
  };

  // Aturan Beban handlers
  const openAturanModal = (editIndex: number | null = null) => {
    if (editIndex !== null) {
      const item = aturanData[editIndex];
      setAturanFormData({
        tipePartner: item.tipePartner,
        jamMin: item.jamMin.toString(),
        jamMax: item.jamMax.toString(),
        polaBeban: item.polaBeban,
        nilai: item.nilai.toString(),
        aktif: item.aktif,
      });
      setAturanEditMode(true);
      setAturanEditingIndex(editIndex);
    } else {
      setAturanFormData({
        tipePartner: 'junior',
        jamMin: '',
        jamMax: '',
        polaBeban: 'TAMBAH_JAM_TETAP',
        nilai: '',
        aktif: true,
      });
      setAturanEditMode(false);
      setAturanEditingIndex(null);
    }
    setAturanFormErrors({});
    setAturanModalOpen(true);
  };

  const closeAturanModal = () => {
    setAturanModalOpen(false);
    setAturanFormData({});
    setAturanFormErrors({});
    setAturanEditMode(false);
    setAturanEditingIndex(null);
  };

  const handleSaveAturan = async () => {
    if (!actor || aturanSaving) return;

    const errors: any = {};
    if (!aturanFormData.jamMin?.trim()) errors.jamMin = 'Required';
    if (!aturanFormData.jamMax?.trim()) errors.jamMax = 'Required';
    if (!aturanFormData.nilai?.trim()) errors.nilai = 'Required';

    if (Object.keys(errors).length > 0) {
      setAturanFormErrors(errors);
      return;
    }

    const parsedMin = parseNatToBigInt(aturanFormData.jamMin);
    const parsedMax = parseNatToBigInt(aturanFormData.jamMax);
    const parsedNilai = parseNatToBigInt(aturanFormData.nilai);

    if (parsedMin.error) {
      setAturanFormErrors({ jamMin: parsedMin.error });
      return;
    }
    if (parsedMax.error) {
      setAturanFormErrors({ jamMax: parsedMax.error });
      return;
    }
    if (parsedNilai.error) {
      setAturanFormErrors({ nilai: parsedNilai.error });
      return;
    }

    setAturanSaving(true);
    try {
      const kodeOpt = aturanEditMode && aturanEditingIndex !== null
        ? `ATB-${String(aturanEditingIndex + 1).padStart(4, '0')}`
        : null;

      await actor.upsertAturanBeban(
        kodeOpt,
        aturanFormData.tipePartner,
        parsedMin.value!,
        parsedMax.value!,
        aturanFormData.polaBeban,
        parsedNilai.value!,
        aturanFormData.aktif
      );

      await fetchAturan();
      closeAturanModal();
    } catch (error: any) {
      alert(`Failed to save: ${error?.message || 'Unknown error'}`);
    } finally {
      setAturanSaving(false);
    }
  };

  const handleArchiveAturan = async (index: number) => {
    if (!actor || aturanSaving) return;
    if (!confirm('Archive this item?')) return;

    const item = aturanData[index];
    setAturanSaving(true);
    try {
      const kode = `ATB-${String(index + 1).padStart(4, '0')}`;
      await actor.upsertAturanBeban(
        kode,
        item.tipePartner,
        item.jamMin,
        item.jamMax,
        item.polaBeban,
        item.nilai,
        false
      );
      await fetchAturan();
    } catch (error: any) {
      alert(`Failed to archive: ${error?.message || 'Unknown error'}`);
    } finally {
      setAturanSaving(false);
    }
  };

  // Konstanta handlers
  const handleSaveKonstanta = async () => {
    if (!actor || konstantaSaving) return;

    const parsed = parseNatToBigInt(konstantaInput);
    if (parsed.error) {
      setKonstantaInputError(parsed.error);
      return;
    }

    setKonstantaSaving(true);
    try {
      await actor.setKonstantaUnitClient(parsed.value!);
      await fetchKonstanta();
      setKonstantaInput('');
      setKonstantaInputError('');
    } catch (error: any) {
      alert(`Failed to save: ${error?.message || 'Unknown error'}`);
    } finally {
      setKonstantaSaving(false);
    }
  };

  // Filter functions
  const getFilteredKamus = () => {
    if (kamusShowArchived) return kamusData;
    return kamusData.filter(item => item.aktif);
  };

  const getFilteredAturan = () => {
    if (aturanShowArchived) return aturanData;
    return aturanData.filter(item => item.aktif);
  };

  // Compute Ringkasan counts
  const kamusActiveCount = kamusData.filter(k => k.aktif).length;
  const kamusArchivedCount = kamusData.filter(k => !k.aktif).length;
  const aturanActiveCount = aturanData.filter(a => a.aktif).length;
  const aturanArchivedCount = aturanData.filter(a => !a.aktif).length;

  // Filter users by role and status
  const pendingUsers = enrichedUsers.filter(u => u.status === 'pending');
  const clientUsers = enrichedUsers.filter(u => u.role === 'client');
  const partnerUsers = enrichedUsers.filter(u => u.role === 'partner');
  const internalUsers = enrichedUsers.filter(u => u.role === 'internal');

  const clientActive = clientUsers.filter(u => u.status === 'active');
  const clientSuspended = clientUsers.filter(u => u.status === 'suspended');
  const clientBlacklisted = clientUsers.filter(u => u.status === 'blacklisted');

  const partnerActive = partnerUsers.filter(u => u.status === 'active');
  const partnerPending = partnerUsers.filter(u => u.status === 'pending');
  const partnerSuspended = partnerUsers.filter(u => u.status === 'suspended');
  const partnerBlacklisted = partnerUsers.filter(u => u.status === 'blacklisted');

  const internalActive = internalUsers.filter(u => u.status === 'active');
  const internalPending = internalUsers.filter(u => u.status === 'pending');

  // Search functionality
  const searchResults = enrichedUsers.filter(user => {
    const query = searchQuery.toLowerCase();
    return (
      user.name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.userId.toLowerCase().includes(query) ||
      user.principal.toString().toLowerCase().includes(query)
    );
  });

  const totalSearchPages = Math.ceil(searchResults.length / SEARCH_PAGE_SIZE);
  const paginatedSearchResults = searchResults.slice(
    (searchPage - 1) * SEARCH_PAGE_SIZE,
    searchPage * SEARCH_PAGE_SIZE
  );

  // Render helpers
  const renderUserRow = (user: EnrichedUser) => (
    <TableRow key={user.principal.toString()} className="cursor-pointer hover:bg-muted/50" onClick={() => openUserDetail(user)}>
      <TableCell className="font-mono text-xs">{user.userId}</TableCell>
      <TableCell>{user.name || '-'}</TableCell>
      <TableCell>{user.email || '-'}</TableCell>
      <TableCell>
        <Badge variant={user.status === 'active' ? 'default' : user.status === 'pending' ? 'secondary' : 'destructive'}>
          {formatUserStatus(user.status)}
        </Badge>
      </TableCell>
    </TableRow>
  );

  if (isAnonymous) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[oklch(0.25_0.05_250)] to-[oklch(0.85_0.03_60)] flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">Please log in to access the Superadmin Dashboard.</p>
            <Button onClick={() => window.location.href = '/internal/login'} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[oklch(0.25_0.05_250)] to-[oklch(0.85_0.03_60)]">
      {/* Header */}
      <header className="bg-[oklch(0.98_0.01_60)] border-b border-[oklch(0.85_0.02_60)] sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/assets/asistenku-horizontal.png" alt="Asistenku" className="h-8" />
            <span className="text-sm text-muted-foreground">
              Hello, Superadmin
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="ringkasan">Ringkasan</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="masterdata">Master Data</TabsTrigger>
            <TabsTrigger value="rates">Rates</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
          </TabsList>

          {/* Ringkasan Tab */}
          <TabsContent value="ringkasan" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Summary</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchRingkasan}
                disabled={ringkasanLoading || !actor || actorFetching}
                type="button"
              >
                {ringkasanLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
            </div>

            {ringkasanError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{ringkasanError}</AlertDescription>
              </Alert>
            )}

            {!ringkasanData && !ringkasanLoading && (
              <Alert>
                <AlertDescription>No data available. Click Refresh to load.</AlertDescription>
              </Alert>
            )}

            {ringkasanData && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{ringkasanData.totalUsers}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Master Data Keys</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{ringkasanData.masterDataKeys}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Kamus Pekerjaan</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Active:</span>
                        <span className="font-semibold">{kamusActiveCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Archived:</span>
                        <span className="font-semibold">{kamusArchivedCount}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Aturan Beban</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Active:</span>
                        <span className="font-semibold">{aturanActiveCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Archived:</span>
                        <span className="font-semibold">{aturanArchivedCount}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Konstanta Unit Client</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Value:</span>
                        <span className="font-semibold">{konstantaData?.unitKeJamPerusahaan.toString() || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Updated:</span>
                        <span className="text-xs">{formatTimestamp(konstantaData?.updatedAt)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Partner Rates</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      {ringkasanData.rates && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Junior:</span>
                            <span className="font-semibold">{ringkasanData.rates[0].toString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Senior:</span>
                            <span className="font-semibold">{ringkasanData.rates[1].toString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Expert:</span>
                            <span className="font-semibold">{ringkasanData.rates[2].toString()}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Users Management</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchUsers}
                disabled={usersLoading || !actor || actorFetching}
                type="button"
              >
                {usersLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
            </div>

            {usersError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{usersError}</AlertDescription>
              </Alert>
            )}

            {/* Search Panel */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Search Users</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, email, user ID, or principal..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setSearchPage(1);
                      }}
                      className="pl-9"
                    />
                  </div>
                </div>

                {searchQuery && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                    </p>
                    {searchResults.length > 0 && (
                      <>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>User ID</TableHead>
                              <TableHead>Name</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paginatedSearchResults.map(renderUserRow)}
                          </TableBody>
                        </Table>
                        {totalSearchPages > 1 && (
                          <div className="flex items-center justify-between mt-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSearchPage(p => Math.max(1, p - 1))}
                              disabled={searchPage === 1}
                              type="button"
                            >
                              Previous
                            </Button>
                            <span className="text-sm text-muted-foreground">
                              Page {searchPage} of {totalSearchPages}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSearchPage(p => Math.min(totalSearchPages, p + 1))}
                              disabled={searchPage === totalSearchPages}
                              type="button"
                            >
                              Next
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pending Users */}
            <Card>
              <CardHeader
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => setPendingUsersExpanded(!pendingUsersExpanded)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Pending Users ({pendingUsers.length})</CardTitle>
                  {pendingUsersExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                </div>
              </CardHeader>
              {pendingUsersExpanded && (
                <CardContent>
                  {pendingUsers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No pending users</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User ID</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingUsers.map(renderUserRow)}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              )}
            </Card>

            {/* Client Users */}
            <Card>
              <CardHeader
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => setClientExpanded(!clientExpanded)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Client Users ({clientUsers.length})</CardTitle>
                  {clientExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                </div>
              </CardHeader>
              {clientExpanded && (
                <CardContent className="space-y-4">
                  {/* Active Clients */}
                  <div>
                    <div
                      className="flex items-center justify-between cursor-pointer hover:bg-muted/30 p-2 rounded"
                      onClick={() => setClientActiveExpanded(!clientActiveExpanded)}
                    >
                      <h4 className="font-semibold">Active ({clientActive.length})</h4>
                      {clientActiveExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </div>
                    {clientActiveExpanded && clientActive.length > 0 && (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {clientActive.map(renderUserRow)}
                        </TableBody>
                      </Table>
                    )}
                  </div>

                  {/* Suspended Clients */}
                  <div>
                    <div
                      className="flex items-center justify-between cursor-pointer hover:bg-muted/30 p-2 rounded"
                      onClick={() => setClientSuspendedExpanded(!clientSuspendedExpanded)}
                    >
                      <h4 className="font-semibold">Suspended ({clientSuspended.length})</h4>
                      {clientSuspendedExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </div>
                    {clientSuspendedExpanded && clientSuspended.length > 0 && (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {clientSuspended.map(renderUserRow)}
                        </TableBody>
                      </Table>
                    )}
                  </div>

                  {/* Blacklisted Clients */}
                  <div>
                    <div
                      className="flex items-center justify-between cursor-pointer hover:bg-muted/30 p-2 rounded"
                      onClick={() => setClientBlacklistedExpanded(!clientBlacklistedExpanded)}
                    >
                      <h4 className="font-semibold">Blacklisted ({clientBlacklisted.length})</h4>
                      {clientBlacklistedExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </div>
                    {clientBlacklistedExpanded && clientBlacklisted.length > 0 && (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {clientBlacklisted.map(renderUserRow)}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Partner Users */}
            <Card>
              <CardHeader
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => setPartnerExpanded(!partnerExpanded)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Partner Users ({partnerUsers.length})</CardTitle>
                  {partnerExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                </div>
              </CardHeader>
              {partnerExpanded && (
                <CardContent className="space-y-4">
                  {/* Active Partners */}
                  <div>
                    <div
                      className="flex items-center justify-between cursor-pointer hover:bg-muted/30 p-2 rounded"
                      onClick={() => setPartnerActiveExpanded(!partnerActiveExpanded)}
                    >
                      <h4 className="font-semibold">Active ({partnerActive.length})</h4>
                      {partnerActiveExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </div>
                    {partnerActiveExpanded && partnerActive.length > 0 && (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {partnerActive.map(renderUserRow)}
                        </TableBody>
                      </Table>
                    )}
                  </div>

                  {/* Pending Partners */}
                  <div>
                    <div
                      className="flex items-center justify-between cursor-pointer hover:bg-muted/30 p-2 rounded"
                      onClick={() => setPartnerPendingExpanded(!partnerPendingExpanded)}
                    >
                      <h4 className="font-semibold">Pending ({partnerPending.length})</h4>
                      {partnerPendingExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </div>
                    {partnerPendingExpanded && partnerPending.length > 0 && (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {partnerPending.map(renderUserRow)}
                        </TableBody>
                      </Table>
                    )}
                  </div>

                  {/* Suspended Partners */}
                  <div>
                    <div
                      className="flex items-center justify-between cursor-pointer hover:bg-muted/30 p-2 rounded"
                      onClick={() => setPartnerSuspendedExpanded(!partnerSuspendedExpanded)}
                    >
                      <h4 className="font-semibold">Suspended ({partnerSuspended.length})</h4>
                      {partnerSuspendedExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </div>
                    {partnerSuspendedExpanded && partnerSuspended.length > 0 && (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {partnerSuspended.map(renderUserRow)}
                        </TableBody>
                      </Table>
                    )}
                  </div>

                  {/* Blacklisted Partners */}
                  <div>
                    <div
                      className="flex items-center justify-between cursor-pointer hover:bg-muted/30 p-2 rounded"
                      onClick={() => setPartnerBlacklistedExpanded(!partnerBlacklistedExpanded)}
                    >
                      <h4 className="font-semibold">Blacklisted ({partnerBlacklisted.length})</h4>
                      {partnerBlacklistedExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </div>
                    {partnerBlacklistedExpanded && partnerBlacklisted.length > 0 && (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {partnerBlacklisted.map(renderUserRow)}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Internal Users */}
            <Card>
              <CardHeader
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => setInternalExpanded(!internalExpanded)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Internal Users ({internalUsers.length})</CardTitle>
                  {internalExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                </div>
              </CardHeader>
              {internalExpanded && (
                <CardContent className="space-y-4">
                  {/* Active Internal */}
                  <div>
                    <div
                      className="flex items-center justify-between cursor-pointer hover:bg-muted/30 p-2 rounded"
                      onClick={() => setInternalActiveExpanded(!internalActiveExpanded)}
                    >
                      <h4 className="font-semibold">Active ({internalActive.length})</h4>
                      {internalActiveExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </div>
                    {internalActiveExpanded && internalActive.length > 0 && (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {internalActive.map(renderUserRow)}
                        </TableBody>
                      </Table>
                    )}
                  </div>

                  {/* Pending Internal */}
                  <div>
                    <div
                      className="flex items-center justify-between cursor-pointer hover:bg-muted/30 p-2 rounded"
                      onClick={() => setInternalPendingExpanded(!internalPendingExpanded)}
                    >
                      <h4 className="font-semibold">Pending ({internalPending.length})</h4>
                      {internalPendingExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </div>
                    {internalPendingExpanded && internalPending.length > 0 && (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {internalPending.map(renderUserRow)}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          </TabsContent>

          {/* Master Data Tab */}
          <TabsContent value="masterdata" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Master Data</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchMasterData}
                disabled={masterDataLoading || !actor || actorFetching}
                type="button"
              >
                {masterDataLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
            </div>

            {masterDataError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{masterDataError}</AlertDescription>
              </Alert>
            )}

            {/* Master Data Map */}
            <Card>
              <CardHeader
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => setMdMapExpanded(!mdMapExpanded)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle>Master Data Map (Key/Value)</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        fetchMdMap();
                      }}
                      disabled={mdMapLoading || !actor || actorFetching}
                      type="button"
                    >
                      {mdMapLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    </Button>
                    {mdMapExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </div>
                </div>
              </CardHeader>
              {mdMapExpanded && (
                <CardContent className="space-y-4">
                  {mdMapError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{mdMapError}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>Key</Label>
                        <Input
                          value={mdMapKey}
                          onChange={(e) => setMdMapKey(e.target.value)}
                          placeholder="Enter key"
                          disabled={mapSaving || mdMapEditMode}
                          readOnly={mdMapEditMode}
                        />
                      </div>
                      <div>
                        <Label>Value</Label>
                        <Input
                          value={mdMapValue}
                          onChange={(e) => setMdMapValue(e.target.value)}
                          placeholder="Enter value"
                          disabled={mapSaving}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleSaveMdMap}
                        disabled={mapSaving || !actor || actorFetching}
                        size="sm"
                        type="button"
                      >
                        {mapSaving ? 'Saving...' : 'Save'}
                      </Button>
                      {mdMapEditMode && (
                        <Button
                          variant="outline"
                          onClick={handleCancelMdMapEdit}
                          disabled={mapSaving}
                          size="sm"
                          type="button"
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>

                  {mdMapData && mdMapData.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Key</TableHead>
                          <TableHead>Value</TableHead>
                          <TableHead className="w-24">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {mdMapData.map(([key, value]) => (
                          <TableRow key={key}>
                            <TableCell className="font-mono text-sm">{key}</TableCell>
                            <TableCell className="text-sm">{value}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditMdMap(key, value)}
                                  disabled={mapSaving}
                                  type="button"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteMdMap(key)}
                                  disabled={mapSaving}
                                  type="button"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-sm text-muted-foreground">Belum ada data</p>
                  )}
                </CardContent>
              )}
            </Card>

            {/* Kamus Pekerjaan */}
            <Card>
              <CardHeader
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => setKamusExpanded(!kamusExpanded)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle>Kamus Pekerjaan</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        fetchKamus();
                      }}
                      disabled={kamusLoading || !actor || actorFetching}
                      type="button"
                    >
                      {kamusLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    </Button>
                    {kamusExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </div>
                </div>
              </CardHeader>
              {kamusExpanded && (
                <CardContent className="space-y-4">
                  {kamusError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{kamusError}</AlertDescription>
                    </Alert>
                  )}

                  <div className="flex items-center justify-between">
                    <Button
                      onClick={() => openKamusModal()}
                      disabled={!actor || actorFetching}
                      size="sm"
                      type="button"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add New
                    </Button>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="kamus-show-archived" className="text-sm">Show Archived</Label>
                      <Switch
                        id="kamus-show-archived"
                        checked={kamusShowArchived}
                        onCheckedChange={setKamusShowArchived}
                      />
                    </div>
                  </div>

                  {getFilteredKamus().length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Kategori</TableHead>
                          <TableHead>Jenis</TableHead>
                          <TableHead>Jam Standar</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-32">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getFilteredKamus().map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.kategoriPekerjaan}</TableCell>
                            <TableCell>{item.jenisPekerjaan}</TableCell>
                            <TableCell>{item.jamStandar.toString()}</TableCell>
                            <TableCell>
                              {item.aktif ? (
                                <Badge variant="default">Active</Badge>
                              ) : (
                                kamusShowArchived && <Badge variant="secondary">Archived</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openKamusModal(index)}
                                  disabled={kamusSaving}
                                  type="button"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                {item.aktif && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleArchiveKamus(index)}
                                    disabled={kamusSaving}
                                    type="button"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-sm text-muted-foreground">No data available</p>
                  )}
                </CardContent>
              )}
            </Card>

            {/* Aturan Beban */}
            <Card>
              <CardHeader
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => setAturanExpanded(!aturanExpanded)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle>Aturan Beban Perusahaan</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        fetchAturan();
                      }}
                      disabled={aturanLoading || !actor || actorFetching}
                      type="button"
                    >
                      {aturanLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    </Button>
                    {aturanExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </div>
                </div>
              </CardHeader>
              {aturanExpanded && (
                <CardContent className="space-y-4">
                  {aturanError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{aturanError}</AlertDescription>
                    </Alert>
                  )}

                  <div className="flex items-center justify-between">
                    <Button
                      onClick={() => openAturanModal()}
                      disabled={!actor || actorFetching}
                      size="sm"
                      type="button"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add New
                    </Button>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="aturan-show-archived" className="text-sm">Show Archived</Label>
                      <Switch
                        id="aturan-show-archived"
                        checked={aturanShowArchived}
                        onCheckedChange={setAturanShowArchived}
                      />
                    </div>
                  </div>

                  {getFilteredAturan().length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tipe Partner</TableHead>
                          <TableHead>Jam Min</TableHead>
                          <TableHead>Jam Max</TableHead>
                          <TableHead>Pola</TableHead>
                          <TableHead>Nilai</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-32">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getFilteredAturan().map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{formatTipePartner(item.tipePartner)}</TableCell>
                            <TableCell>{item.jamMin.toString()}</TableCell>
                            <TableCell>{item.jamMax.toString()}</TableCell>
                            <TableCell>{formatPolaBeban(item.polaBeban)}</TableCell>
                            <TableCell>{item.nilai.toString()}</TableCell>
                            <TableCell>
                              {item.aktif ? (
                                <Badge variant="default">Active</Badge>
                              ) : (
                                aturanShowArchived && <Badge variant="secondary">Archived</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openAturanModal(index)}
                                  disabled={aturanSaving}
                                  type="button"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                {item.aktif && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleArchiveAturan(index)}
                                    disabled={aturanSaving}
                                    type="button"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-sm text-muted-foreground">No data available</p>
                  )}
                </CardContent>
              )}
            </Card>

            {/* Konstanta Unit Client */}
            <Card>
              <CardHeader
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => setKonstantaExpanded(!konstantaExpanded)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle>Konstanta Unit Client</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        fetchKonstanta();
                      }}
                      disabled={konstantaLoading || !actor || actorFetching}
                      type="button"
                    >
                      {konstantaLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    </Button>
                    {konstantaExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </div>
                </div>
              </CardHeader>
              {konstantaExpanded && (
                <CardContent className="space-y-4">
                  {konstantaError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{konstantaError}</AlertDescription>
                    </Alert>
                  )}

                  {konstantaData && (
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Current Value</p>
                      <p className="text-2xl font-bold">{konstantaData.unitKeJamPerusahaan.toString()}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Updated: {formatTimestamp(konstantaData.updatedAt)}
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>New Value</Label>
                    <Input
                      type="number"
                      value={konstantaInput}
                      onChange={(e) => {
                        setKonstantaInput(e.target.value);
                        setKonstantaInputError('');
                      }}
                      placeholder="Enter new value"
                      disabled={konstantaSaving}
                    />
                    {konstantaInputError && (
                      <p className="text-sm text-destructive">{konstantaInputError}</p>
                    )}
                    <Button
                      onClick={handleSaveKonstanta}
                      disabled={konstantaSaving || !actor || actorFetching}
                      size="sm"
                      type="button"
                    >
                      {konstantaSaving ? 'Updating...' : 'Update'}
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          </TabsContent>

          {/* Rates Tab */}
          <TabsContent value="rates" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Partner Rates</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchRates}
                disabled={ratesLoading || !actor || actorFetching}
                type="button"
              >
                {ratesLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
            </div>

            {ratesError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{ratesError}</AlertDescription>
              </Alert>
            )}

            {ratesData && (
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle>Junior Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{ratesData.juniorRate?.toString() || '-'}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Senior Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{ratesData.seniorRate?.toString() || '-'}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Expert Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{ratesData.expertRate?.toString() || '-'}</p>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Tasks</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchTasks}
                disabled={tasksLoading || !actor || actorFetching}
                type="button"
              >
                {tasksLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
            </div>

            {tasksError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{tasksError}</AlertDescription>
              </Alert>
            )}

            {tasksData && tasksData.tasks.length > 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Task ID</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Phase</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tasksData.tasks.map((task) => (
                        <TableRow key={task.taskId}>
                          <TableCell className="font-mono text-xs">{task.taskId}</TableCell>
                          <TableCell>{task.title}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{String(task.phase)}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">{formatTimestamp(task.createdAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground text-center">No tasks available</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* User Detail Modal */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              {detailModalMode === 'view' ? 'View user information' : 'Edit user information'}
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">User ID</Label>
                  <p className="font-mono text-sm">{selectedUser.userId}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Role</Label>
                  <p className="text-sm">{selectedUser.role}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Name</Label>
                  <p className="text-sm">{selectedUser.name || '-'}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Email</Label>
                  <p className="text-sm">{selectedUser.email || '-'}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">WhatsApp</Label>
                  <p className="text-sm">{selectedUser.whatsapp || '-'}</p>
                </div>
                {selectedUser.company && (
                  <div>
                    <Label className="text-sm text-muted-foreground">Company</Label>
                    <p className="text-sm">{selectedUser.company}</p>
                  </div>
                )}
                {selectedUser.keahlian && (
                  <div>
                    <Label className="text-sm text-muted-foreground">Keahlian</Label>
                    <p className="text-sm">{selectedUser.keahlian}</p>
                  </div>
                )}
                {selectedUser.domisili && (
                  <div>
                    <Label className="text-sm text-muted-foreground">Domisili</Label>
                    <p className="text-sm">{selectedUser.domisili}</p>
                  </div>
                )}
              </div>

              {detailModalMode === 'view' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Status</Label>
                    <p className="text-sm">
                      <Badge variant={selectedUser.status === 'active' ? 'default' : selectedUser.status === 'pending' ? 'secondary' : 'destructive'}>
                        {formatUserStatus(selectedUser.status)}
                      </Badge>
                    </p>
                  </div>
                  {selectedUser.role === 'partner' && selectedUser.partnerLevel && (
                    <div>
                      <Label className="text-sm text-muted-foreground">Partner Level</Label>
                      <p className="text-sm">
                        <Badge variant="outline">{formatTipePartner(selectedUser.partnerLevel)}</Badge>
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Status</Label>
                    <Select
                      value={editFormData.status}
                      onValueChange={(value) => setEditFormData({ ...editFormData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                        <SelectItem value="blacklisted">Blacklisted</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedUser.role === 'partner' && (
                    <div>
                      <Label>Partner Level</Label>
                      <Select
                        value={editFormData.partnerLevel}
                        onValueChange={(value) => setEditFormData({ ...editFormData, partnerLevel: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="junior">Junior</SelectItem>
                          <SelectItem value="senior">Senior</SelectItem>
                          <SelectItem value="expert">Expert</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {detailModalMode === 'view' ? (
              <>
                <Button variant="outline" onClick={() => setDetailModalOpen(false)} type="button">
                  Close
                </Button>
                <Button onClick={handleEditUser} type="button">
                  Edit
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={handleCancelEdit} disabled={updateLoading} type="button">
                  Cancel
                </Button>
                <Button onClick={handleUpdateUser} disabled={updateLoading} type="button">
                  {updateLoading ? 'Updating...' : 'Update'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Kamus Modal */}
      <Dialog open={kamusModalOpen} onOpenChange={setKamusModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{kamusEditMode ? 'Edit Kamus Pekerjaan' : 'Add Kamus Pekerjaan'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Kategori Pekerjaan</Label>
              <Input
                value={kamusFormData.kategoriPekerjaan || ''}
                onChange={(e) => setKamusFormData({ ...kamusFormData, kategoriPekerjaan: e.target.value })}
                placeholder="Enter kategori"
              />
              {kamusFormErrors.kategoriPekerjaan && (
                <p className="text-sm text-destructive">{kamusFormErrors.kategoriPekerjaan}</p>
              )}
            </div>

            <div>
              <Label>Jenis Pekerjaan</Label>
              <Input
                value={kamusFormData.jenisPekerjaan || ''}
                onChange={(e) => setKamusFormData({ ...kamusFormData, jenisPekerjaan: e.target.value })}
                placeholder="Enter jenis"
              />
              {kamusFormErrors.jenisPekerjaan && (
                <p className="text-sm text-destructive">{kamusFormErrors.jenisPekerjaan}</p>
              )}
            </div>

            <div>
              <Label>Jam Standar</Label>
              <Input
                type="number"
                value={kamusFormData.jamStandar || ''}
                onChange={(e) => setKamusFormData({ ...kamusFormData, jamStandar: e.target.value })}
                placeholder="Enter jam standar"
              />
              {kamusFormErrors.jamStandar && (
                <p className="text-sm text-destructive">{kamusFormErrors.jamStandar}</p>
              )}
            </div>

            <div>
              <Label>Tipe Partner Boleh</Label>
              <div className="space-y-2 mt-2">
                {['junior', 'senior', 'expert'].map((type) => (
                  <div key={type} className="flex items-center gap-2">
                    <Checkbox
                      checked={kamusFormData.tipePartnerBoleh?.includes(type)}
                      onCheckedChange={(checked) => {
                        const current = kamusFormData.tipePartnerBoleh || [];
                        if (checked) {
                          setKamusFormData({ ...kamusFormData, tipePartnerBoleh: [...current, type] });
                        } else {
                          setKamusFormData({ ...kamusFormData, tipePartnerBoleh: current.filter((t: string) => t !== type) });
                        }
                      }}
                    />
                    <Label className="capitalize">{type}</Label>
                  </div>
                ))}
              </div>
              {kamusFormErrors.tipePartnerBoleh && (
                <p className="text-sm text-destructive">{kamusFormErrors.tipePartnerBoleh}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                checked={kamusFormData.aktif}
                onCheckedChange={(checked) => setKamusFormData({ ...kamusFormData, aktif: checked })}
              />
              <Label>Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeKamusModal} disabled={kamusSaving} type="button">
              Cancel
            </Button>
            <Button onClick={handleSaveKamus} disabled={kamusSaving} type="button">
              {kamusSaving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Aturan Modal */}
      <Dialog open={aturanModalOpen} onOpenChange={setAturanModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{aturanEditMode ? 'Edit Aturan Beban' : 'Add Aturan Beban'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Tipe Partner</Label>
              <Select
                value={aturanFormData.tipePartner}
                onValueChange={(value) => setAturanFormData({ ...aturanFormData, tipePartner: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="junior">Junior</SelectItem>
                  <SelectItem value="senior">Senior</SelectItem>
                  <SelectItem value="expert">Expert</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Jam Min</Label>
                <Input
                  type="number"
                  value={aturanFormData.jamMin || ''}
                  onChange={(e) => setAturanFormData({ ...aturanFormData, jamMin: e.target.value })}
                  placeholder="Min"
                />
                {aturanFormErrors.jamMin && (
                  <p className="text-sm text-destructive">{aturanFormErrors.jamMin}</p>
                )}
              </div>
              <div>
                <Label>Jam Max</Label>
                <Input
                  type="number"
                  value={aturanFormData.jamMax || ''}
                  onChange={(e) => setAturanFormData({ ...aturanFormData, jamMax: e.target.value })}
                  placeholder="Max"
                />
                {aturanFormErrors.jamMax && (
                  <p className="text-sm text-destructive">{aturanFormErrors.jamMax}</p>
                )}
              </div>
            </div>

            <div>
              <Label>Pola Beban</Label>
              <Select
                value={aturanFormData.polaBeban}
                onValueChange={(value) => setAturanFormData({ ...aturanFormData, polaBeban: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TAMBAH_JAM_TETAP">TAMBAH_JAM_TETAP</SelectItem>
                  <SelectItem value="TAMBAH_PER_JAM">TAMBAH_PER_JAM</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Nilai</Label>
              <Input
                type="number"
                value={aturanFormData.nilai || ''}
                onChange={(e) => setAturanFormData({ ...aturanFormData, nilai: e.target.value })}
                placeholder="Enter nilai"
              />
              {aturanFormErrors.nilai && (
                <p className="text-sm text-destructive">{aturanFormErrors.nilai}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                checked={aturanFormData.aktif}
                onCheckedChange={(checked) => setAturanFormData({ ...aturanFormData, aktif: checked })}
              />
              <Label>Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeAturanModal} disabled={aturanSaving} type="button">
              Cancel
            </Button>
            <Button onClick={handleSaveAturan} disabled={aturanSaving} type="button">
              {aturanSaving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="mt-12 py-6 text-center text-sm text-muted-foreground">
        <p>Asistenku © {new Date().getFullYear()} PT. Asistenku Digital Indonesia</p>
      </footer>
    </div>
  );
}
