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

  const [kamusData, setKamusData] = useState<KamusPekerjaan[]>([]);
  const [kamusLoading, setKamusLoading] = useState(false);
  const [kamusError, setKamusError] = useState<string | null>(null);
  const [kamusExpanded, setKamusExpanded] = useState(true);
  const [kamusModalOpen, setKamusModalOpen] = useState(false);
  const [kamusFormData, setKamusFormData] = useState<any>({});
  const [kamusFormErrors, setKamusFormErrors] = useState<any>({});
  const [kamusShowArchived, setKamusShowArchived] = useState(false);

  const [aturanData, setAturanData] = useState<AturanBebanPerusahaan[]>([]);
  const [aturanLoading, setAturanLoading] = useState(false);
  const [aturanError, setAturanError] = useState<string | null>(null);
  const [aturanExpanded, setAturanExpanded] = useState(true);
  const [aturanModalOpen, setAturanModalOpen] = useState(false);
  const [aturanFormData, setAturanFormData] = useState<any>({});
  const [aturanFormErrors, setAturanFormErrors] = useState<any>({});
  const [aturanShowArchived, setAturanShowArchived] = useState(false);

  const [konstantaData, setKonstantaData] = useState<KonstantaUnitClient | null>(null);
  const [konstantaLoading, setKonstantaLoading] = useState(false);
  const [konstantaError, setKonstantaError] = useState<string | null>(null);
  const [konstantaExpanded, setKonstantaExpanded] = useState(true);
  const [konstantaInput, setKonstantaInput] = useState('');
  const [konstantaInputError, setKonstantaInputError] = useState('');

  // STEP 2: Saving guards for Master Data mutations
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
      const [usersResult, masterDataResult, ratesResult] = await Promise.all([
        actor.listUsersBasic('').catch(() => []),
        actor.getMasterDataMap().catch(() => null),
        actor.getRates().catch(() => null),
      ]);

      setRingkasanData({
        totalUsers: countArray(usersResult),
        masterDataKeys: countArray(masterDataResult),
        rates: ratesResult,
        usersBreakdown: usersResult,
      });

      // STEP 3: Fetch Master Data for Ringkasan if not already loaded
      if (!masterDataData) {
        const [kamusResult, aturanResult, konstantaResult] = await Promise.all([
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
      }
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
    try {
      await clear();
      window.location.assign('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Search functionality
  const searchResults = enrichedUsers.filter((user) => {
    if (!searchQuery) return false;
    const query = searchQuery.toLowerCase();
    return (
      user.userId.toLowerCase().includes(query) ||
      user.principal.toString().toLowerCase().includes(query) ||
      (user.name && user.name.toLowerCase().includes(query)) ||
      user.role.toLowerCase().includes(query)
    );
  });

  const totalSearchPages = Math.ceil(searchResults.length / SEARCH_PAGE_SIZE);
  const paginatedSearchResults = searchResults.slice(
    (searchPage - 1) * SEARCH_PAGE_SIZE,
    searchPage * SEARCH_PAGE_SIZE
  );

  // Categorize users (without search filter for main sections)
  const pendingUsers = enrichedUsers.filter((u) => u.status === 'pending');
  const clientUsers = enrichedUsers.filter((u) => u.role === 'client');
  const partnerUsers = enrichedUsers.filter((u) => u.role === 'partner');
  const internalUsers = enrichedUsers.filter((u) => u.role === 'internal');

  // Client subsections
  const clientActive = clientUsers.filter((u) => u.status === 'active');
  const clientSuspended = clientUsers.filter((u) => u.status === 'suspended');
  const clientBlacklisted = clientUsers.filter((u) => u.status === 'blacklisted');

  // Partner subsections
  const partnerActive = partnerUsers.filter((u) => u.status === 'active');
  const partnerPending = partnerUsers.filter((u) => u.status === 'pending');
  const partnerSuspended = partnerUsers.filter((u) => u.status === 'suspended');
  const partnerBlacklisted = partnerUsers.filter((u) => u.status === 'blacklisted');

  // Internal subsections
  const internalActive = internalUsers.filter((u) => u.status === 'active');
  const internalPending = internalUsers.filter((u) => u.status === 'pending');

  // Handle activate user
  const handleActivateUser = async (user: EnrichedUser) => {
    if (!actor || actorFetching || updateLoading) return;
    try {
      await actor.setUserStatus(user.principal, 'active' as UserStatus);
      await fetchUsers();
    } catch (error: any) {
      alert('Failed to activate user: ' + (error?.message || 'Unknown error'));
    }
  };

  // Handle open detail modal
  const handleOpenDetail = async (user: EnrichedUser) => {
    if (!actor) return;
    setSelectedUser(user);
    setDetailModalMode('view');
    
    try {
      const profile = await actor.getUserProfile(user.principal);
      if (profile && '__kind__' in profile) {
        const kind = profile.__kind__;
        if (kind === 'client' && 'client' in profile) {
          const data = { ...profile.client, status: user.status };
          setEditFormData(data);
          setOriginalFormData(data);
        } else if (kind === 'partner' && 'partner' in profile) {
          const level = await actor.getPartnerLevel(user.principal);
          const data = { ...profile.partner, status: user.status, partnerLevel: level };
          setEditFormData(data);
          setOriginalFormData(data);
        } else if (kind === 'internal' && 'internal' in profile) {
          const data = { ...profile.internal, status: user.status };
          setEditFormData(data);
          setOriginalFormData(data);
        }
      }
    } catch (error: any) {
      console.error('Failed to load user profile:', error);
    }
    
    setDetailModalOpen(true);
  };

  // Handle edit mode
  const handleEditMode = () => {
    setDetailModalMode('edit');
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditFormData(originalFormData);
    setDetailModalMode('view');
  };

  // Handle update user
  const handleUpdateUser = async () => {
    if (!actor || !selectedUser || updateLoading) return;
    
    setUpdateLoading(true);
    try {
      // Update status if changed
      if (editFormData.status !== originalFormData.status) {
        await actor.setUserStatus(selectedUser.principal, editFormData.status as UserStatus);
      }

      // Update partner level if changed
      if (selectedUser.role === 'partner' && editFormData.partnerLevel !== originalFormData.partnerLevel) {
        await actor.setPartnerLevel(selectedUser.principal, editFormData.partnerLevel as TipePartner);
      }

      // Refresh users data
      await fetchUsers();
      
      // Update modal data
      setOriginalFormData(editFormData);
      setDetailModalMode('view');
      
      alert('User updated successfully');
    } catch (error: any) {
      alert('Failed to update user: ' + (error?.message || 'Unknown error'));
    } finally {
      setUpdateLoading(false);
    }
  };

  // Master Data Map handlers with saving guard
  const handleSaveMdMap = async () => {
    if (!actor || actorFetching || mapSaving) return;
    if (!mdMapKey.trim() || !mdMapValue.trim()) {
      alert('Key and value are required');
      return;
    }

    setMapSaving(true);
    try {
      await actor.pushMasterData(mdMapKey, mdMapValue);
      setMdMapKey('');
      setMdMapValue('');
      await fetchMdMap();
    } catch (error: any) {
      alert('Failed to save: ' + (error?.message || 'Unknown error'));
    } finally {
      setMapSaving(false);
    }
  };

  // Kamus Pekerjaan handlers with saving guard
  const handleOpenKamusModal = (item?: KamusPekerjaan) => {
    if (item) {
      setKamusFormData({
        kategoriPekerjaan: item.kategoriPekerjaan,
        jenisPekerjaan: item.jenisPekerjaan,
        jamStandar: item.jamStandar.toString(),
        tipePartnerBoleh: item.tipePartnerBoleh,
        aktif: item.aktif,
      });
    } else {
      setKamusFormData({
        kategoriPekerjaan: '',
        jenisPekerjaan: '',
        jamStandar: '',
        tipePartnerBoleh: [],
        aktif: true,
      });
    }
    setKamusFormErrors({});
    setKamusModalOpen(true);
  };

  const handleSaveKamus = async () => {
    if (!actor || actorFetching || kamusSaving) return;

    // Validate
    const errors: any = {};
    if (!kamusFormData.kategoriPekerjaan?.trim()) errors.kategoriPekerjaan = 'Required';
    if (!kamusFormData.jenisPekerjaan?.trim()) errors.jenisPekerjaan = 'Required';
    const jamParsed = parseNatToBigInt(kamusFormData.jamStandar);
    if (jamParsed.error) errors.jamStandar = jamParsed.error;
    if (!kamusFormData.tipePartnerBoleh || kamusFormData.tipePartnerBoleh.length === 0) {
      errors.tipePartnerBoleh = 'At least one partner type required';
    }

    if (Object.keys(errors).length > 0) {
      setKamusFormErrors(errors);
      return;
    }

    setKamusSaving(true);
    try {
      await actor.upsertKamusPekerjaan(
        null,
        kamusFormData.kategoriPekerjaan,
        kamusFormData.jenisPekerjaan,
        jamParsed.value!,
        kamusFormData.tipePartnerBoleh,
        kamusFormData.aktif
      );
      setKamusModalOpen(false);
      await fetchKamus();
    } catch (error: any) {
      alert('Failed to save: ' + (error?.message || 'Unknown error'));
    } finally {
      setKamusSaving(false);
    }
  };

  const handleDeleteKamus = async (item: KamusPekerjaan) => {
    if (!actor || actorFetching || kamusSaving) return;
    if (!confirm('Soft delete this item?')) return;

    setKamusSaving(true);
    try {
      await actor.upsertKamusPekerjaan(
        null,
        item.kategoriPekerjaan,
        item.jenisPekerjaan,
        item.jamStandar,
        item.tipePartnerBoleh,
        false
      );
      await fetchKamus();
    } catch (error: any) {
      alert('Failed to delete: ' + (error?.message || 'Unknown error'));
    } finally {
      setKamusSaving(false);
    }
  };

  // Aturan Beban handlers with saving guard
  const handleOpenAturanModal = (item?: AturanBebanPerusahaan) => {
    if (item) {
      setAturanFormData({
        tipePartner: item.tipePartner,
        jamMin: item.jamMin.toString(),
        jamMax: item.jamMax.toString(),
        polaBeban: item.polaBeban,
        nilai: item.nilai.toString(),
        aktif: item.aktif,
      });
    } else {
      setAturanFormData({
        tipePartner: 'junior',
        jamMin: '',
        jamMax: '',
        polaBeban: 'TAMBAH_JAM_TETAP',
        nilai: '',
        aktif: true,
      });
    }
    setAturanFormErrors({});
    setAturanModalOpen(true);
  };

  const handleSaveAturan = async () => {
    if (!actor || actorFetching || aturanSaving) return;

    // Validate
    const errors: any = {};
    const jamMinParsed = parseNatToBigInt(aturanFormData.jamMin);
    if (jamMinParsed.error) errors.jamMin = jamMinParsed.error;
    const jamMaxParsed = parseNatToBigInt(aturanFormData.jamMax);
    if (jamMaxParsed.error) errors.jamMax = jamMaxParsed.error;
    const nilaiParsed = parseNatToBigInt(aturanFormData.nilai);
    if (nilaiParsed.error) errors.nilai = nilaiParsed.error;

    if (Object.keys(errors).length > 0) {
      setAturanFormErrors(errors);
      return;
    }

    setAturanSaving(true);
    try {
      await actor.upsertAturanBeban(
        null,
        aturanFormData.tipePartner as TipePartner,
        jamMinParsed.value!,
        jamMaxParsed.value!,
        aturanFormData.polaBeban as Variant_TAMBAH_PER_JAM_TAMBAH_JAM_TETAP,
        nilaiParsed.value!,
        aturanFormData.aktif
      );
      setAturanModalOpen(false);
      await fetchAturan();
    } catch (error: any) {
      alert('Failed to save: ' + (error?.message || 'Unknown error'));
    } finally {
      setAturanSaving(false);
    }
  };

  const handleDeleteAturan = async (item: AturanBebanPerusahaan) => {
    if (!actor || actorFetching || aturanSaving) return;
    if (!confirm('Soft delete this item?')) return;

    setAturanSaving(true);
    try {
      await actor.upsertAturanBeban(
        null,
        item.tipePartner,
        item.jamMin,
        item.jamMax,
        item.polaBeban,
        item.nilai,
        false
      );
      await fetchAturan();
    } catch (error: any) {
      alert('Failed to delete: ' + (error?.message || 'Unknown error'));
    } finally {
      setAturanSaving(false);
    }
  };

  // Konstanta handler with saving guard
  const handleUpdateKonstanta = async () => {
    if (!actor || actorFetching || konstantaSaving) return;

    const parsed = parseNatToBigInt(konstantaInput);
    if (parsed.error) {
      setKonstantaInputError(parsed.error);
      return;
    }

    setKonstantaSaving(true);
    try {
      await actor.setKonstantaUnitClient(parsed.value!);
      setKonstantaInput('');
      setKonstantaInputError('');
      await fetchKonstanta();
    } catch (error: any) {
      alert('Failed to update: ' + (error?.message || 'Unknown error'));
    } finally {
      setKonstantaSaving(false);
    }
  };

  // STEP 3: Compute Master Data counts for Ringkasan
  const kamusActiveCount = masterDataData?.kamusPekerjaan.filter(k => k.aktif).length || 0;
  const kamusArchivedCount = masterDataData?.kamusPekerjaan.filter(k => !k.aktif).length || 0;
  const aturanActiveCount = masterDataData?.aturanBeban.filter(a => a.aktif).length || 0;
  const aturanArchivedCount = masterDataData?.aturanBeban.filter(a => !a.aktif).length || 0;
  const masterDataMapKeyCount = masterDataData?.masterDataMap?.length || 0;

  // STEP 3: Filter Kamus and Aturan based on archived toggle
  const filteredKamus = kamusShowArchived 
    ? kamusData 
    : kamusData.filter(k => k.aktif);

  const filteredAturan = aturanShowArchived 
    ? aturanData 
    : aturanData.filter(a => a.aktif);

  if (isAnonymous) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[oklch(0.25_0.05_250)] to-[oklch(0.85_0.05_70)] flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-[oklch(0.98_0.01_70)]">
          <CardHeader>
            <CardTitle className="text-center text-[oklch(0.25_0.05_250)]">Authentication Required</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-[oklch(0.4_0.03_250)] mb-4">Please log in to access the Superadmin Dashboard.</p>
            <Button onClick={() => window.location.assign('/internal/login')} className="bg-[oklch(0.45_0.15_250)] hover:bg-[oklch(0.35_0.15_250)]">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[oklch(0.25_0.05_250)] to-[oklch(0.85_0.05_70)]">
      {/* Header */}
      <header className="bg-[oklch(0.98_0.01_70)] border-b border-[oklch(0.85_0.02_70)] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/assets/asistenku-horizontal.png" alt="Asistenku" className="h-8" />
            <span className="text-lg font-semibold text-[oklch(0.25_0.05_250)]">Superadmin</span>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="border-[oklch(0.45_0.15_250)] text-[oklch(0.45_0.15_250)] hover:bg-[oklch(0.45_0.15_250)] hover:text-white"
          >
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6 bg-[oklch(0.98_0.01_70)]">
            <TabsTrigger value="ringkasan">Ringkasan</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="masterdata">Master Data</TabsTrigger>
            <TabsTrigger value="rates">Rates</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
          </TabsList>

          {/* Ringkasan Tab */}
          <TabsContent value="ringkasan" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">Summary</h2>
              <Button
                onClick={fetchRingkasan}
                disabled={ringkasanLoading || !actor || actorFetching}
                variant="outline"
                size="sm"
                className="bg-white"
              >
                {ringkasanLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                <span className="ml-2">Refresh</span>
              </Button>
            </div>

            {ringkasanError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{ringkasanError}</AlertDescription>
              </Alert>
            )}

            {ringkasanLoading && !ringkasanData ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </div>
            ) : ringkasanData ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card className="bg-[oklch(0.98_0.01_70)]">
                  <CardHeader>
                    <CardTitle className="text-[oklch(0.25_0.05_250)]">Total Users</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-[oklch(0.45_0.15_250)]">{ringkasanData.totalUsers}</p>
                  </CardContent>
                </Card>

                <Card className="bg-[oklch(0.98_0.01_70)]">
                  <CardHeader>
                    <CardTitle className="text-[oklch(0.25_0.05_250)]">Master Data Keys</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-[oklch(0.45_0.15_250)]">{ringkasanData.masterDataKeys}</p>
                  </CardContent>
                </Card>

                <Card className="bg-[oklch(0.98_0.01_70)]">
                  <CardHeader>
                    <CardTitle className="text-[oklch(0.25_0.05_250)]">Partner Rates</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {ringkasanData.rates ? (
                      <div className="space-y-1 text-sm">
                        <p>Junior: Rp {ringkasanData.rates[0].toString()}</p>
                        <p>Senior: Rp {ringkasanData.rates[1].toString()}</p>
                        <p>Expert: Rp {ringkasanData.rates[2].toString()}</p>
                      </div>
                    ) : (
                      <p className="text-[oklch(0.5_0.03_250)]">-</p>
                    )}
                  </CardContent>
                </Card>

                {/* STEP 3: Master Data Counts */}
                <Card className="bg-[oklch(0.98_0.01_70)]">
                  <CardHeader>
                    <CardTitle className="text-[oklch(0.25_0.05_250)]">Kamus Pekerjaan</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1 text-sm">
                      <p>Active: <span className="font-semibold text-green-600">{kamusActiveCount}</span></p>
                      <p>Archived: <span className="font-semibold text-gray-500">{kamusArchivedCount}</span></p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-[oklch(0.98_0.01_70)]">
                  <CardHeader>
                    <CardTitle className="text-[oklch(0.25_0.05_250)]">Aturan Beban</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1 text-sm">
                      <p>Active: <span className="font-semibold text-green-600">{aturanActiveCount}</span></p>
                      <p>Archived: <span className="font-semibold text-gray-500">{aturanArchivedCount}</span></p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-[oklch(0.98_0.01_70)]">
                  <CardHeader>
                    <CardTitle className="text-[oklch(0.25_0.05_250)]">Konstanta Unit Client</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {masterDataData?.konstanta ? (
                      <div className="space-y-1 text-sm">
                        <p>Value: <span className="font-semibold">{masterDataData.konstanta.unitKeJamPerusahaan.toString()}</span></p>
                        <p className="text-xs text-gray-500">Updated: {formatTimestamp(masterDataData.konstanta.updatedAt)}</p>
                      </div>
                    ) : (
                      <p className="text-[oklch(0.5_0.03_250)]">-</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="bg-[oklch(0.98_0.01_70)]">
                <CardContent className="py-8 text-center text-[oklch(0.5_0.03_250)]">
                  No data available. Click Refresh to load.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">Users Management</h2>
              <Button
                onClick={fetchUsers}
                disabled={usersLoading || !actor || actorFetching}
                variant="outline"
                size="sm"
                className="bg-white"
              >
                {usersLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                <span className="ml-2">Refresh</span>
              </Button>
            </div>

            {usersError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{usersError}</AlertDescription>
              </Alert>
            )}

            {/* Search */}
            <Card className="bg-[oklch(0.98_0.01_70)]">
              <CardHeader>
                <CardTitle className="text-[oklch(0.25_0.05_250)]">Search Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Search by User ID, Principal, Name, or Role..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setSearchPage(1);
                      }}
                      className="pl-10"
                    />
                  </div>
                </div>

                {searchQuery && searchResults.length > 0 && (
                  <div className="mt-4">
                    <h3 className="font-semibold mb-2">Search Results ({searchResults.length})</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User ID</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedSearchResults.map((user) => (
                          <TableRow key={user.userId}>
                            <TableCell className="font-mono text-xs">{user.userId}</TableCell>
                            <TableCell>{user.name || '-'}</TableCell>
                            <TableCell>{user.role}</TableCell>
                            <TableCell>
                              <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                                {formatUserStatus(user.status)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenDetail(user)}
                              >
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {totalSearchPages > 1 && (
                      <div className="flex items-center justify-between mt-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSearchPage((p) => Math.max(1, p - 1))}
                          disabled={searchPage === 1}
                        >
                          Previous
                        </Button>
                        <span className="text-sm">
                          Page {searchPage} of {totalSearchPages}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSearchPage((p) => Math.min(totalSearchPages, p + 1))}
                          disabled={searchPage === totalSearchPages}
                        >
                          Next
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {searchQuery && searchResults.length === 0 && (
                  <p className="mt-4 text-center text-gray-500">No results found</p>
                )}
              </CardContent>
            </Card>

            {usersLoading && !usersData ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </div>
            ) : usersData ? (
              <div className="space-y-4">
                {/* Pending Users */}
                <Card className="bg-[oklch(0.98_0.01_70)]">
                  <CardHeader
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => setPendingUsersExpanded(!pendingUsersExpanded)}
                  >
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-[oklch(0.25_0.05_250)]">
                        Pending Approval ({pendingUsers.length})
                      </CardTitle>
                      {pendingUsersExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                    </div>
                  </CardHeader>
                  {pendingUsersExpanded && (
                    <CardContent>
                      {pendingUsers.length === 0 ? (
                        <p className="text-center text-gray-500 py-4">No pending users</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>User ID</TableHead>
                              <TableHead>Name</TableHead>
                              <TableHead>Role</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {pendingUsers.map((user) => (
                              <TableRow key={user.userId}>
                                <TableCell className="font-mono text-xs">{user.userId}</TableCell>
                                <TableCell>{user.name || '-'}</TableCell>
                                <TableCell>{user.role}</TableCell>
                                <TableCell>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => handleActivateUser(user)}
                                      disabled={!actor || actorFetching || updateLoading}
                                    >
                                      Activate
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleOpenDetail(user)}
                                    >
                                      View
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  )}
                </Card>

                {/* Client Users */}
                <Card className="bg-[oklch(0.98_0.01_70)]">
                  <CardHeader
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => setClientExpanded(!clientExpanded)}
                  >
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-[oklch(0.25_0.05_250)]">
                        Clients ({clientUsers.length})
                      </CardTitle>
                      {clientExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                    </div>
                  </CardHeader>
                  {clientExpanded && (
                    <CardContent className="space-y-4">
                      {/* Active Clients */}
                      <div>
                        <div
                          className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded"
                          onClick={() => setClientActiveExpanded(!clientActiveExpanded)}
                        >
                          <h4 className="font-semibold text-green-600">Active ({clientActive.length})</h4>
                          {clientActiveExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </div>
                        {clientActiveExpanded && clientActive.length > 0 && (
                          <Table className="mt-2">
                            <TableHeader>
                              <TableRow>
                                <TableHead>User ID</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Company</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {clientActive.map((user) => (
                                <TableRow key={user.userId}>
                                  <TableCell className="font-mono text-xs">{user.userId}</TableCell>
                                  <TableCell>{user.name || '-'}</TableCell>
                                  <TableCell>{user.company || '-'}</TableCell>
                                  <TableCell>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleOpenDetail(user)}
                                    >
                                      View
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </div>

                      {/* Suspended Clients */}
                      <div>
                        <div
                          className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded"
                          onClick={() => setClientSuspendedExpanded(!clientSuspendedExpanded)}
                        >
                          <h4 className="font-semibold text-orange-600">Suspended ({clientSuspended.length})</h4>
                          {clientSuspendedExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </div>
                        {clientSuspendedExpanded && clientSuspended.length > 0 && (
                          <Table className="mt-2">
                            <TableHeader>
                              <TableRow>
                                <TableHead>User ID</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Company</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {clientSuspended.map((user) => (
                                <TableRow key={user.userId}>
                                  <TableCell className="font-mono text-xs">{user.userId}</TableCell>
                                  <TableCell>{user.name || '-'}</TableCell>
                                  <TableCell>{user.company || '-'}</TableCell>
                                  <TableCell>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleOpenDetail(user)}
                                    >
                                      View
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </div>

                      {/* Blacklisted Clients */}
                      <div>
                        <div
                          className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded"
                          onClick={() => setClientBlacklistedExpanded(!clientBlacklistedExpanded)}
                        >
                          <h4 className="font-semibold text-red-600">Blacklisted ({clientBlacklisted.length})</h4>
                          {clientBlacklistedExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </div>
                        {clientBlacklistedExpanded && clientBlacklisted.length > 0 && (
                          <Table className="mt-2">
                            <TableHeader>
                              <TableRow>
                                <TableHead>User ID</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Company</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {clientBlacklisted.map((user) => (
                                <TableRow key={user.userId}>
                                  <TableCell className="font-mono text-xs">{user.userId}</TableCell>
                                  <TableCell>{user.name || '-'}</TableCell>
                                  <TableCell>{user.company || '-'}</TableCell>
                                  <TableCell>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleOpenDetail(user)}
                                    >
                                      View
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>

                {/* Partner Users */}
                <Card className="bg-[oklch(0.98_0.01_70)]">
                  <CardHeader
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => setPartnerExpanded(!partnerExpanded)}
                  >
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-[oklch(0.25_0.05_250)]">
                        Partners ({partnerUsers.length})
                      </CardTitle>
                      {partnerExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                    </div>
                  </CardHeader>
                  {partnerExpanded && (
                    <CardContent className="space-y-4">
                      {/* Active Partners */}
                      <div>
                        <div
                          className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded"
                          onClick={() => setPartnerActiveExpanded(!partnerActiveExpanded)}
                        >
                          <h4 className="font-semibold text-green-600">Active ({partnerActive.length})</h4>
                          {partnerActiveExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </div>
                        {partnerActiveExpanded && partnerActive.length > 0 && (
                          <Table className="mt-2">
                            <TableHeader>
                              <TableRow>
                                <TableHead>User ID</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Level</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {partnerActive.map((user) => (
                                <TableRow key={user.userId}>
                                  <TableCell className="font-mono text-xs">{user.userId}</TableCell>
                                  <TableCell>{user.name || '-'}</TableCell>
                                  <TableCell>{user.partnerLevel ? formatTipePartner(user.partnerLevel) : '-'}</TableCell>
                                  <TableCell>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleOpenDetail(user)}
                                    >
                                      View
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </div>

                      {/* Pending Partners */}
                      <div>
                        <div
                          className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded"
                          onClick={() => setPartnerPendingExpanded(!partnerPendingExpanded)}
                        >
                          <h4 className="font-semibold text-yellow-600">Pending ({partnerPending.length})</h4>
                          {partnerPendingExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </div>
                        {partnerPendingExpanded && partnerPending.length > 0 && (
                          <Table className="mt-2">
                            <TableHeader>
                              <TableRow>
                                <TableHead>User ID</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {partnerPending.map((user) => (
                                <TableRow key={user.userId}>
                                  <TableCell className="font-mono text-xs">{user.userId}</TableCell>
                                  <TableCell>{user.name || '-'}</TableCell>
                                  <TableCell>
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        onClick={() => handleActivateUser(user)}
                                        disabled={!actor || actorFetching || updateLoading}
                                      >
                                        Activate
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleOpenDetail(user)}
                                      >
                                        View
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </div>

                      {/* Suspended Partners */}
                      <div>
                        <div
                          className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded"
                          onClick={() => setPartnerSuspendedExpanded(!partnerSuspendedExpanded)}
                        >
                          <h4 className="font-semibold text-orange-600">Suspended ({partnerSuspended.length})</h4>
                          {partnerSuspendedExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </div>
                        {partnerSuspendedExpanded && partnerSuspended.length > 0 && (
                          <Table className="mt-2">
                            <TableHeader>
                              <TableRow>
                                <TableHead>User ID</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {partnerSuspended.map((user) => (
                                <TableRow key={user.userId}>
                                  <TableCell className="font-mono text-xs">{user.userId}</TableCell>
                                  <TableCell>{user.name || '-'}</TableCell>
                                  <TableCell>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleOpenDetail(user)}
                                    >
                                      View
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </div>

                      {/* Blacklisted Partners */}
                      <div>
                        <div
                          className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded"
                          onClick={() => setPartnerBlacklistedExpanded(!partnerBlacklistedExpanded)}
                        >
                          <h4 className="font-semibold text-red-600">Blacklisted ({partnerBlacklisted.length})</h4>
                          {partnerBlacklistedExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </div>
                        {partnerBlacklistedExpanded && partnerBlacklisted.length > 0 && (
                          <Table className="mt-2">
                            <TableHeader>
                              <TableRow>
                                <TableHead>User ID</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {partnerBlacklisted.map((user) => (
                                <TableRow key={user.userId}>
                                  <TableCell className="font-mono text-xs">{user.userId}</TableCell>
                                  <TableCell>{user.name || '-'}</TableCell>
                                  <TableCell>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleOpenDetail(user)}
                                    >
                                      View
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>

                {/* Internal Users */}
                <Card className="bg-[oklch(0.98_0.01_70)]">
                  <CardHeader
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => setInternalExpanded(!internalExpanded)}
                  >
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-[oklch(0.25_0.05_250)]">
                        Internal ({internalUsers.length})
                      </CardTitle>
                      {internalExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                    </div>
                  </CardHeader>
                  {internalExpanded && (
                    <CardContent className="space-y-4">
                      {/* Active Internal */}
                      <div>
                        <div
                          className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded"
                          onClick={() => setInternalActiveExpanded(!internalActiveExpanded)}
                        >
                          <h4 className="font-semibold text-green-600">Active ({internalActive.length})</h4>
                          {internalActiveExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </div>
                        {internalActiveExpanded && internalActive.length > 0 && (
                          <Table className="mt-2">
                            <TableHeader>
                              <TableRow>
                                <TableHead>User ID</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Internal Role</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {internalActive.map((user) => (
                                <TableRow key={user.userId}>
                                  <TableCell className="font-mono text-xs">{user.userId}</TableCell>
                                  <TableCell>{user.name || '-'}</TableCell>
                                  <TableCell>{user.internalRole || '-'}</TableCell>
                                  <TableCell>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleOpenDetail(user)}
                                    >
                                      View
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </div>

                      {/* Pending Internal */}
                      <div>
                        <div
                          className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded"
                          onClick={() => setInternalPendingExpanded(!internalPendingExpanded)}
                        >
                          <h4 className="font-semibold text-yellow-600">Pending ({internalPending.length})</h4>
                          {internalPendingExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </div>
                        {internalPendingExpanded && internalPending.length > 0 && (
                          <Table className="mt-2">
                            <TableHeader>
                              <TableRow>
                                <TableHead>User ID</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Internal Role</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {internalPending.map((user) => (
                                <TableRow key={user.userId}>
                                  <TableCell className="font-mono text-xs">{user.userId}</TableCell>
                                  <TableCell>{user.name || '-'}</TableCell>
                                  <TableCell>{user.internalRole || '-'}</TableCell>
                                  <TableCell>
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        onClick={() => handleActivateUser(user)}
                                        disabled={!actor || actorFetching || updateLoading}
                                      >
                                        Activate
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleOpenDetail(user)}
                                      >
                                        View
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              </div>
            ) : (
              <Card className="bg-[oklch(0.98_0.01_70)]">
                <CardContent className="py-8 text-center text-[oklch(0.5_0.03_250)]">
                  No data available. Click Refresh to load.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Master Data Tab */}
          <TabsContent value="masterdata" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">Master Data</h2>
              <Button
                onClick={fetchMasterData}
                disabled={masterDataLoading || !actor || actorFetching}
                variant="outline"
                size="sm"
                className="bg-white"
              >
                {masterDataLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                <span className="ml-2">Refresh</span>
              </Button>
            </div>

            {masterDataError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{masterDataError}</AlertDescription>
              </Alert>
            )}

            {/* Master Data Map */}
            <Card className="bg-[oklch(0.98_0.01_70)]">
              <CardHeader
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => setMdMapExpanded(!mdMapExpanded)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[oklch(0.25_0.05_250)]">Master Data Map</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        fetchMdMap();
                      }}
                      disabled={mdMapLoading || !actor || actorFetching}
                    >
                      {mdMapLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    </Button>
                    {mdMapExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </div>
                </div>
              </CardHeader>
              {mdMapExpanded && (
                <CardContent>
                  {mdMapError && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{mdMapError}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="text"
                        placeholder="Key"
                        value={mdMapKey}
                        onChange={(e) => setMdMapKey(e.target.value)}
                        disabled={!actor || actorFetching || mapSaving}
                      />
                      <Input
                        type="text"
                        placeholder="Value"
                        value={mdMapValue}
                        onChange={(e) => setMdMapValue(e.target.value)}
                        disabled={!actor || actorFetching || mapSaving}
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={handleSaveMdMap}
                      disabled={!actor || actorFetching || mapSaving}
                    >
                      {mapSaving ? 'Saving...' : 'Save'}
                    </Button>

                    {mdMapLoading && !mdMapData ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : mdMapData && mdMapData.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Key</TableHead>
                            <TableHead>Value</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {mdMapData.map(([key, value]) => (
                            <TableRow key={key}>
                              <TableCell className="font-mono text-xs">{key}</TableCell>
                              <TableCell>{value}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-center text-gray-500 py-4">No data</p>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Kamus Pekerjaan */}
            <Card className="bg-[oklch(0.98_0.01_70)]">
              <CardHeader
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => setKamusExpanded(!kamusExpanded)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[oklch(0.25_0.05_250)]">Kamus Pekerjaan</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        fetchKamus();
                      }}
                      disabled={kamusLoading || !actor || actorFetching}
                    >
                      {kamusLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    </Button>
                    {kamusExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </div>
                </div>
              </CardHeader>
              {kamusExpanded && (
                <CardContent>
                  {kamusError && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{kamusError}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Button
                        type="button"
                        onClick={() => handleOpenKamusModal()}
                        disabled={!actor || actorFetching || kamusSaving}
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

                    {kamusLoading && kamusData.length === 0 ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : filteredKamus.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Kategori</TableHead>
                            <TableHead>Jenis</TableHead>
                            <TableHead>Jam Standar</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredKamus.map((item, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{item.kategoriPekerjaan}</TableCell>
                              <TableCell>{item.jenisPekerjaan}</TableCell>
                              <TableCell>{item.jamStandar.toString()}</TableCell>
                              <TableCell>
                                <Badge variant={item.aktif ? 'default' : 'secondary'} className={item.aktif ? 'bg-green-600' : 'bg-gray-500'}>
                                  {item.aktif ? 'Active' : 'Archived'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteKamus(item)}
                                  disabled={!actor || actorFetching || kamusSaving}
                                >
                                  {kamusSaving ? 'Deleting...' : <Trash2 className="h-4 w-4" />}
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-center text-gray-500 py-4">No data</p>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Aturan Beban */}
            <Card className="bg-[oklch(0.98_0.01_70)]">
              <CardHeader
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => setAturanExpanded(!aturanExpanded)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[oklch(0.25_0.05_250)]">Aturan Beban Perusahaan</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        fetchAturan();
                      }}
                      disabled={aturanLoading || !actor || actorFetching}
                    >
                      {aturanLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    </Button>
                    {aturanExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </div>
                </div>
              </CardHeader>
              {aturanExpanded && (
                <CardContent>
                  {aturanError && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{aturanError}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Button
                        type="button"
                        onClick={() => handleOpenAturanModal()}
                        disabled={!actor || actorFetching || aturanSaving}
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

                    {aturanLoading && aturanData.length === 0 ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : filteredAturan.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tipe Partner</TableHead>
                            <TableHead>Jam Min</TableHead>
                            <TableHead>Jam Max</TableHead>
                            <TableHead>Pola</TableHead>
                            <TableHead>Nilai</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredAturan.map((item, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{formatTipePartner(item.tipePartner)}</TableCell>
                              <TableCell>{item.jamMin.toString()}</TableCell>
                              <TableCell>{item.jamMax.toString()}</TableCell>
                              <TableCell>{formatPolaBeban(item.polaBeban)}</TableCell>
                              <TableCell>{item.nilai.toString()}</TableCell>
                              <TableCell>
                                <Badge variant={item.aktif ? 'default' : 'secondary'} className={item.aktif ? 'bg-green-600' : 'bg-gray-500'}>
                                  {item.aktif ? 'Active' : 'Archived'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteAturan(item)}
                                  disabled={!actor || actorFetching || aturanSaving}
                                >
                                  {aturanSaving ? 'Deleting...' : <Trash2 className="h-4 w-4" />}
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-center text-gray-500 py-4">No data</p>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Konstanta Unit Client */}
            <Card className="bg-[oklch(0.98_0.01_70)]">
              <CardHeader
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => setKonstantaExpanded(!konstantaExpanded)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[oklch(0.25_0.05_250)]">Konstanta Unit Client</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        fetchKonstanta();
                      }}
                      disabled={konstantaLoading || !actor || actorFetching}
                    >
                      {konstantaLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    </Button>
                    {konstantaExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </div>
                </div>
              </CardHeader>
              {konstantaExpanded && (
                <CardContent>
                  {konstantaError && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{konstantaError}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-4">
                    {konstantaData && (
                      <div className="p-4 bg-gray-50 rounded">
                        <p className="text-sm text-gray-600">Current Value</p>
                        <p className="text-2xl font-bold">{konstantaData.unitKeJamPerusahaan.toString()}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Updated: {formatTimestamp(konstantaData.updatedAt)}
                        </p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="konstanta-input">New Value</Label>
                      <Input
                        id="konstanta-input"
                        type="text"
                        placeholder="Enter new value"
                        value={konstantaInput}
                        onChange={(e) => {
                          setKonstantaInput(e.target.value);
                          setKonstantaInputError('');
                        }}
                        disabled={!actor || actorFetching || konstantaSaving}
                      />
                      {konstantaInputError && (
                        <p className="text-sm text-red-600">{konstantaInputError}</p>
                      )}
                    </div>

                    <Button
                      type="button"
                      onClick={handleUpdateKonstanta}
                      disabled={!actor || actorFetching || konstantaSaving}
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
              <h2 className="text-2xl font-bold text-white">Partner Rates</h2>
              <Button
                onClick={fetchRates}
                disabled={ratesLoading || !actor || actorFetching}
                variant="outline"
                size="sm"
                className="bg-white"
              >
                {ratesLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                <span className="ml-2">Refresh</span>
              </Button>
            </div>

            {ratesError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{ratesError}</AlertDescription>
              </Alert>
            )}

            {ratesLoading && !ratesData ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </div>
            ) : ratesData ? (
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-[oklch(0.98_0.01_70)]">
                  <CardHeader>
                    <CardTitle className="text-[oklch(0.25_0.05_250)]">Junior Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-[oklch(0.45_0.15_250)]">
                      Rp {ratesData.juniorRate?.toString() || '-'}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-[oklch(0.98_0.01_70)]">
                  <CardHeader>
                    <CardTitle className="text-[oklch(0.25_0.05_250)]">Senior Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-[oklch(0.45_0.15_250)]">
                      Rp {ratesData.seniorRate?.toString() || '-'}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-[oklch(0.98_0.01_70)]">
                  <CardHeader>
                    <CardTitle className="text-[oklch(0.25_0.05_250)]">Expert Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-[oklch(0.45_0.15_250)]">
                      Rp {ratesData.expertRate?.toString() || '-'}
                    </p>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="bg-[oklch(0.98_0.01_70)]">
                <CardContent className="py-8 text-center text-[oklch(0.5_0.03_250)]">
                  No data available. Click Refresh to load.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">Tasks Overview</h2>
              <Button
                onClick={fetchTasks}
                disabled={tasksLoading || !actor || actorFetching}
                variant="outline"
                size="sm"
                className="bg-white"
              >
                {tasksLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                <span className="ml-2">Refresh</span>
              </Button>
            </div>

            {tasksError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{tasksError}</AlertDescription>
              </Alert>
            )}

            {tasksLoading && !tasksData ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </div>
            ) : tasksData ? (
              <Card className="bg-[oklch(0.98_0.01_70)]">
                <CardHeader>
                  <CardTitle className="text-[oklch(0.25_0.05_250)]">All Tasks ({tasksData.tasks.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {tasksData.tasks.length === 0 ? (
                    <p className="text-center text-gray-500 py-4">No tasks found</p>
                  ) : (
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
                              <Badge>{String(task.phase)}</Badge>
                            </TableCell>
                            <TableCell>{formatTimestamp(task.createdAt)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-[oklch(0.98_0.01_70)]">
                <CardContent className="py-8 text-center text-[oklch(0.5_0.03_250)]">
                  No data available. Click Refresh to load.
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* User Detail Modal */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              {selectedUser && `${selectedUser.role} - ${selectedUser.userId}`}
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-semibold">User ID</Label>
                  <p className="text-sm font-mono">{selectedUser.userId}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Role</Label>
                  <p className="text-sm">{selectedUser.role}</p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-semibold">Principal</Label>
                <p className="text-xs font-mono break-all">{selectedUser.principal.toString()}</p>
              </div>

              <div>
                <Label htmlFor="edit-status" className="text-sm font-semibold">Status</Label>
                {detailModalMode === 'view' ? (
                  <p className="text-sm">{formatUserStatus(editFormData.status)}</p>
                ) : (
                  <Select
                    value={editFormData.status}
                    onValueChange={(value) => setEditFormData({ ...editFormData, status: value })}
                  >
                    <SelectTrigger id="edit-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="blacklisted">Blacklisted</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>

              {editFormData.name && (
                <div>
                  <Label className="text-sm font-semibold">Name</Label>
                  <p className="text-sm">{editFormData.name}</p>
                </div>
              )}

              {editFormData.email && (
                <div>
                  <Label className="text-sm font-semibold">Email</Label>
                  <p className="text-sm">{editFormData.email}</p>
                </div>
              )}

              {editFormData.whatsapp && (
                <div>
                  <Label className="text-sm font-semibold">WhatsApp</Label>
                  <p className="text-sm">{editFormData.whatsapp}</p>
                </div>
              )}

              {editFormData.company && (
                <div>
                  <Label className="text-sm font-semibold">Company</Label>
                  <p className="text-sm">{editFormData.company}</p>
                </div>
              )}

              {editFormData.keahlian && (
                <div>
                  <Label className="text-sm font-semibold">Keahlian</Label>
                  <p className="text-sm">{editFormData.keahlian}</p>
                </div>
              )}

              {editFormData.domisili && (
                <div>
                  <Label className="text-sm font-semibold">Domisili</Label>
                  <p className="text-sm">{editFormData.domisili}</p>
                </div>
              )}

              {selectedUser.role === 'partner' && (
                <div>
                  <Label htmlFor="edit-partner-level" className="text-sm font-semibold">Partner Level</Label>
                  {detailModalMode === 'view' ? (
                    <p className="text-sm">{editFormData.partnerLevel ? formatTipePartner(editFormData.partnerLevel) : '-'}</p>
                  ) : (
                    <Select
                      value={editFormData.partnerLevel || 'junior'}
                      onValueChange={(value) => setEditFormData({ ...editFormData, partnerLevel: value })}
                    >
                      <SelectTrigger id="edit-partner-level">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="junior">Junior</SelectItem>
                        <SelectItem value="senior">Senior</SelectItem>
                        <SelectItem value="expert">Expert</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              {editFormData.internalRole && (
                <div>
                  <Label className="text-sm font-semibold">Internal Role</Label>
                  <p className="text-sm">{editFormData.internalRole}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {detailModalMode === 'view' ? (
              <>
                <Button variant="outline" onClick={() => setDetailModalOpen(false)}>
                  Close
                </Button>
                <Button onClick={handleEditMode}>
                  Edit
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={handleCancelEdit}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateUser} disabled={updateLoading || !actor || actorFetching}>
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
            <DialogTitle>Add Kamus Pekerjaan</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="kamus-kategori">Kategori Pekerjaan</Label>
              <Input
                id="kamus-kategori"
                type="text"
                value={kamusFormData.kategoriPekerjaan || ''}
                onChange={(e) => setKamusFormData({ ...kamusFormData, kategoriPekerjaan: e.target.value })}
                disabled={kamusSaving}
              />
              {kamusFormErrors.kategoriPekerjaan && (
                <p className="text-sm text-red-600">{kamusFormErrors.kategoriPekerjaan}</p>
              )}
            </div>

            <div>
              <Label htmlFor="kamus-jenis">Jenis Pekerjaan</Label>
              <Input
                id="kamus-jenis"
                type="text"
                value={kamusFormData.jenisPekerjaan || ''}
                onChange={(e) => setKamusFormData({ ...kamusFormData, jenisPekerjaan: e.target.value })}
                disabled={kamusSaving}
              />
              {kamusFormErrors.jenisPekerjaan && (
                <p className="text-sm text-red-600">{kamusFormErrors.jenisPekerjaan}</p>
              )}
            </div>

            <div>
              <Label htmlFor="kamus-jam">Jam Standar</Label>
              <Input
                id="kamus-jam"
                type="text"
                value={kamusFormData.jamStandar || ''}
                onChange={(e) => setKamusFormData({ ...kamusFormData, jamStandar: e.target.value })}
                disabled={kamusSaving}
              />
              {kamusFormErrors.jamStandar && (
                <p className="text-sm text-red-600">{kamusFormErrors.jamStandar}</p>
              )}
            </div>

            <div>
              <Label>Tipe Partner Boleh</Label>
              <div className="space-y-2">
                {['junior', 'senior', 'expert'].map((tipe) => (
                  <div key={tipe} className="flex items-center gap-2">
                    <Checkbox
                      id={`kamus-tipe-${tipe}`}
                      checked={kamusFormData.tipePartnerBoleh?.includes(tipe) || false}
                      onCheckedChange={(checked) => {
                        const current = kamusFormData.tipePartnerBoleh || [];
                        if (checked) {
                          setKamusFormData({ ...kamusFormData, tipePartnerBoleh: [...current, tipe] });
                        } else {
                          setKamusFormData({ ...kamusFormData, tipePartnerBoleh: current.filter((t: string) => t !== tipe) });
                        }
                      }}
                      disabled={kamusSaving}
                    />
                    <Label htmlFor={`kamus-tipe-${tipe}`} className="cursor-pointer">{tipe}</Label>
                  </div>
                ))}
              </div>
              {kamusFormErrors.tipePartnerBoleh && (
                <p className="text-sm text-red-600">{kamusFormErrors.tipePartnerBoleh}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="kamus-aktif"
                checked={kamusFormData.aktif !== false}
                onCheckedChange={(checked) => setKamusFormData({ ...kamusFormData, aktif: checked === true })}
                disabled={kamusSaving}
              />
              <Label htmlFor="kamus-aktif" className="cursor-pointer">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setKamusModalOpen(false)} disabled={kamusSaving}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSaveKamus} disabled={kamusSaving || !actor || actorFetching}>
              {kamusSaving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Aturan Modal */}
      <Dialog open={aturanModalOpen} onOpenChange={setAturanModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Aturan Beban</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="aturan-tipe">Tipe Partner</Label>
              <Select
                value={aturanFormData.tipePartner || 'junior'}
                onValueChange={(value) => setAturanFormData({ ...aturanFormData, tipePartner: value })}
              >
                <SelectTrigger id="aturan-tipe">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="junior">Junior</SelectItem>
                  <SelectItem value="senior">Senior</SelectItem>
                  <SelectItem value="expert">Expert</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="aturan-jam-min">Jam Min</Label>
              <Input
                id="aturan-jam-min"
                type="text"
                value={aturanFormData.jamMin || ''}
                onChange={(e) => setAturanFormData({ ...aturanFormData, jamMin: e.target.value })}
                disabled={aturanSaving}
              />
              {aturanFormErrors.jamMin && (
                <p className="text-sm text-red-600">{aturanFormErrors.jamMin}</p>
              )}
            </div>

            <div>
              <Label htmlFor="aturan-jam-max">Jam Max</Label>
              <Input
                id="aturan-jam-max"
                type="text"
                value={aturanFormData.jamMax || ''}
                onChange={(e) => setAturanFormData({ ...aturanFormData, jamMax: e.target.value })}
                disabled={aturanSaving}
              />
              {aturanFormErrors.jamMax && (
                <p className="text-sm text-red-600">{aturanFormErrors.jamMax}</p>
              )}
            </div>

            <div>
              <Label htmlFor="aturan-pola">Pola Beban</Label>
              <Select
                value={aturanFormData.polaBeban || 'TAMBAH_JAM_TETAP'}
                onValueChange={(value) => setAturanFormData({ ...aturanFormData, polaBeban: value })}
              >
                <SelectTrigger id="aturan-pola">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TAMBAH_JAM_TETAP">TAMBAH_JAM_TETAP</SelectItem>
                  <SelectItem value="TAMBAH_PER_JAM">TAMBAH_PER_JAM</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="aturan-nilai">Nilai</Label>
              <Input
                id="aturan-nilai"
                type="text"
                value={aturanFormData.nilai || ''}
                onChange={(e) => setAturanFormData({ ...aturanFormData, nilai: e.target.value })}
                disabled={aturanSaving}
              />
              {aturanFormErrors.nilai && (
                <p className="text-sm text-red-600">{aturanFormErrors.nilai}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="aturan-aktif"
                checked={aturanFormData.aktif !== false}
                onCheckedChange={(checked) => setAturanFormData({ ...aturanFormData, aktif: checked === true })}
                disabled={aturanSaving}
              />
              <Label htmlFor="aturan-aktif" className="cursor-pointer">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAturanModalOpen(false)} disabled={aturanSaving}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSaveAturan} disabled={aturanSaving || !actor || actorFetching}>
              {aturanSaving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="mt-12 py-6 text-center text-white text-sm">
        <p>Asistenku © {new Date().getFullYear()} PT. Asistenku Digital Indonesia</p>
      </footer>
    </div>
  );
}
