import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface LayananAsistenku {
    id: string;
    active: boolean;
    name: string;
    createdAt: bigint;
    createdBy: Principal;
    type: LayananType;
    description: string;
    updatedAt?: bigint;
    updatedBy?: Principal;
    price: bigint;
}
export type LayananType = {
    __kind__: "BusinessConsulting";
    BusinessConsulting: null;
} | {
    __kind__: "LegalServices";
    LegalServices: null;
} | {
    __kind__: "FinancialPlanning";
    FinancialPlanning: null;
} | {
    __kind__: "DigitalMarketing";
    DigitalMarketing: null;
} | {
    __kind__: "VirtualAssistant";
    VirtualAssistant: null;
} | {
    __kind__: "Other";
    Other: string;
};
export type UserRole = {
    __kind__: "client";
    client: ClientProfile;
} | {
    __kind__: "internal";
    internal: InternalProfile;
} | {
    __kind__: "superadmin";
    superadmin: null;
} | {
    __kind__: "partner";
    partner: PartnerProfile;
};
export interface AturanBebanPerusahaan {
    aktif: boolean;
    createdAt: bigint;
    jamMax: bigint;
    jamMin: bigint;
    nilai: bigint;
    polaBeban: Variant_TAMBAH_PER_JAM_TAMBAH_JAM_TETAP;
    tipePartner: TipePartner;
}
export interface KonstantaUnitClient {
    unitKeJamPerusahaan: bigint;
    updatedAt: bigint;
}
export interface InternalProfile {
    name: string;
    role: InternalRole;
    whatsapp: string;
    email: string;
}
export interface KamusPekerjaan {
    aktif: boolean;
    createdAt: bigint;
    tipePartnerBoleh: Array<TipePartner>;
    kategoriPekerjaan: string;
    jenisPekerjaan: string;
    jamStandar: bigint;
}
export interface PartnerProfile {
    keahlian: string;
    name: string;
    whatsapp: string;
    email: string;
    domisili: string;
}
export interface LayananMeta {
    unitUsed: bigint;
    unitTotal: bigint;
    ownerClient: Principal;
    createdAt: bigint;
    isActive: boolean;
    updatedAt: bigint;
    layananId: string;
    unitOnHold: bigint;
}
export interface ClientProfile {
    name: string;
    whatsapp: string;
    email: string;
    company: string;
}
export interface SkillVerified {
    aktif: boolean;
    kode: string;
    nama: string;
    createdAt: bigint;
    kategori: string;
}
export type MasterDataKey = string;
export enum InternalRole {
    admin = "admin",
    finance = "finance",
    concierge = "concierge",
    asistenmu = "asistenmu"
}
export enum TipePartner {
    junior = "junior",
    senior = "senior",
    expert = "expert"
}
export enum UserRole__1 {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export enum UserStatus {
    active = "active",
    pending = "pending",
    suspended = "suspended",
    blacklisted = "blacklisted"
}
export enum Variant_TAMBAH_PER_JAM_TAMBAH_JAM_TETAP {
    TAMBAH_PER_JAM = "TAMBAH_PER_JAM",
    TAMBAH_JAM_TETAP = "TAMBAH_JAM_TETAP"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole__1): Promise<void>;
    claimSuperadmin(): Promise<void>;
    createLayananForClient(name: string, description: string, type: LayananType, price: bigint): Promise<string>;
    createLayananForClientV2(ownerClient: Principal, layananId: string, unitTotal: bigint): Promise<string>;
    getAllUsers(): Promise<Array<[Principal, UserRole]>>;
    getAturanBeban(kode: string): Promise<AturanBebanPerusahaan | null>;
    getCallerUser(): Promise<UserRole | null>;
    getCallerUserProfile(): Promise<UserRole | null>;
    getCallerUserRole(): Promise<UserRole__1>;
    getHourlyRateByLevel(_level: TipePartner): Promise<bigint>;
    getKamusPekerjaan(kode: string): Promise<KamusPekerjaan | null>;
    getKonstantaUnitClient(): Promise<KonstantaUnitClient>;
    getLayananMeta(layananId: string): Promise<LayananMeta | null>;
    getMasterData(key: MasterDataKey): Promise<string>;
    getMasterDataMap(): Promise<Array<[string, string]> | null>;
    getMyHourlyRate(): Promise<bigint>;
    getMyLayananMeta(layananId: string): Promise<LayananMeta | null>;
    getMyPartnerLevel(): Promise<TipePartner>;
    getMyUserId(): Promise<string | null>;
    getMyUserStatus(): Promise<UserStatus>;
    getPartnerLevel(partner: Principal): Promise<TipePartner>;
    getPartnerVerifiedSkills(partner: Principal): Promise<Array<string>>;
    getRates(): Promise<[bigint, bigint, bigint]>;
    getSkillVerified(kode: string): Promise<SkillVerified | null>;
    getUser(callerPrincipal: Principal): Promise<UserRole | null>;
    getUserIdByPrincipal(target: Principal): Promise<string | null>;
    getUserProfile(user: Principal): Promise<UserRole | null>;
    getUserStatus(user: Principal): Promise<UserStatus>;
    isCallerAdmin(): Promise<boolean>;
    kalkulatorAM(kodeKamus: string, tipePartner: TipePartner, beban: bigint): Promise<{
        jamKePartner: bigint;
        unitClient: bigint;
        jamPerusahaan: bigint;
    }>;
    listAturanBeban(): Promise<Array<AturanBebanPerusahaan>>;
    listKamusPekerjaan(): Promise<Array<KamusPekerjaan>>;
    listMyLayanan(): Promise<Array<LayananAsistenku>>;
    listMyLayananV2(): Promise<Array<string>>;
    listPartnerVerifiedSkills(): Promise<Array<[Principal, Array<string>]>>;
    listSkillVerified(): Promise<Array<SkillVerified>>;
    listUsersBasic(roleFilter: string): Promise<Array<[Principal, string, string, UserStatus]>>;
    listUsersByStatus(status: UserStatus): Promise<Array<Principal>>;
    pushMasterData(key: MasterDataKey, data: string): Promise<void>;
    registerClient(profile: ClientProfile): Promise<void>;
    registerInternal(profile: InternalProfile): Promise<void>;
    registerPartner(profile: PartnerProfile): Promise<void>;
    saveCallerUserProfile(_profile: UserRole): Promise<void>;
    setKonstantaUnitClient(unitKeJamPerusahaan: bigint): Promise<void>;
    setLayananActive(layananId: string): Promise<void>;
    setLayananActiveV2(layananId: string, isActive: boolean): Promise<string>;
    setPartnerLevel(partner: Principal, level: TipePartner): Promise<void>;
    setPartnerVerifiedSkills(partner: Principal, skillCodes: Array<string>): Promise<void>;
    setUserStatus(target: Principal, status: UserStatus): Promise<void>;
    upsertAturanBeban(kodeOpt: string | null, tipePartner: TipePartner, jamMin: bigint, jamMax: bigint, polaBeban: Variant_TAMBAH_PER_JAM_TAMBAH_JAM_TETAP, nilai: bigint, aktif: boolean): Promise<string>;
    upsertKamusPekerjaan(kodeOpt: string | null, kategoriPekerjaan: string, jenisPekerjaan: string, jamStandar: bigint, tipePartnerBoleh: Array<TipePartner>, aktif: boolean): Promise<string>;
    upsertSkillVerified(kodeOpt: string | null, nama: string, kategori: string, aktif: boolean): Promise<string>;
}
