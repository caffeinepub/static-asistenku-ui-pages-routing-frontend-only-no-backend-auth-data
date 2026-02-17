import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
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
export interface UserApprovalInfo {
    status: ApprovalStatus;
    principal: Principal;
}
export interface LayananV4 {
    id: string;
    unitUsed: bigint;
    unitTotal: bigint;
    createdAt: bigint;
    createdBy: Principal;
    tipe: LayananTypeV4;
    isArchived: boolean;
    isActive: boolean;
    sharedWith: Array<Principal>;
    clientPrincipal: Principal;
    updatedAt: bigint;
    updatedBy: Principal;
    asistenmuPrincipal: Principal;
    hargaPerUnit: bigint;
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
export enum ApprovalStatus {
    pending = "pending",
    approved = "approved",
    rejected = "rejected"
}
export enum InternalRole {
    admin = "admin",
    finance = "finance",
    concierge = "concierge",
    asistenmu = "asistenmu"
}
export enum LayananTypeV4 {
    EFEKTIF = "EFEKTIF",
    JAGA = "JAGA",
    RAPI = "RAPI",
    FOKUS = "FOKUS",
    TENANG = "TENANG"
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
export enum Variant_TAMBAH_PER_JAM_TAMBAH_JAM_TETAP {
    TAMBAH_PER_JAM = "TAMBAH_PER_JAM",
    TAMBAH_JAM_TETAP = "TAMBAH_JAM_TETAP"
}
export interface backendInterface {
    archiveLayananV4(layananId: string): Promise<LayananV4>;
    assignCallerUserRole(user: Principal, role: UserRole__1): Promise<void>;
    claimSuperadmin(): Promise<void>;
    createLayananV4(input: {
        unitTotal: bigint;
        tipe: LayananTypeV4;
        isActive?: boolean;
        sharedWith: Array<Principal>;
        clientPrincipal: Principal;
        asistenmuPrincipal: Principal;
        hargaPerUnit: bigint;
    }): Promise<LayananV4>;
    editLayananV4(layananId: string, patch: {
        unitTotal?: bigint;
        tipe?: LayananTypeV4;
        isActive?: boolean;
        sharedWith?: Array<Principal>;
        clientPrincipal?: Principal;
        asistenmuPrincipal?: Principal;
        hargaPerUnit?: bigint;
    }): Promise<LayananV4>;
    getAllUsers(): Promise<Array<[Principal, UserRole]>>;
    getAturanBeban(kode: string): Promise<AturanBebanPerusahaan | null>;
    getCallerUser(): Promise<UserRole | null>;
    getCallerUserProfile(): Promise<UserRole | null>;
    getCallerUserRole(): Promise<UserRole__1>;
    getKamusPekerjaan(kode: string): Promise<KamusPekerjaan | null>;
    getKonstantaUnitClient(): Promise<KonstantaUnitClient>;
    getMasterData(key: MasterDataKey): Promise<string>;
    getMasterDataMap(): Promise<Array<[string, string]> | null>;
    getMyUserId(): Promise<string | null>;
    getPartnerVerifiedSkills(partner: Principal): Promise<Array<string>>;
    getSkillVerified(kode: string): Promise<SkillVerified | null>;
    getUser(callerPrincipal: Principal): Promise<UserRole | null>;
    getUserProfile(user: Principal): Promise<UserRole | null>;
    isCallerAdmin(): Promise<boolean>;
    isCallerApproved(): Promise<boolean>;
    kalkulatorAM(kodeKamus: string, tipePartner: TipePartner, beban: bigint): Promise<{
        jamKePartner: bigint;
        unitClient: bigint;
        jamPerusahaan: bigint;
    }>;
    listAllLayananV4(includeArchived: boolean): Promise<Array<LayananV4>>;
    listApprovals(): Promise<Array<UserApprovalInfo>>;
    listAturanBeban(): Promise<Array<AturanBebanPerusahaan>>;
    listKamusPekerjaan(): Promise<Array<KamusPekerjaan>>;
    listLayananV4ByClient(clientPrincipal: Principal, includeArchived: boolean): Promise<Array<LayananV4>>;
    listPartnerVerifiedSkills(): Promise<Array<[Principal, Array<string>]>>;
    listSkillVerified(): Promise<Array<SkillVerified>>;
    pushMasterData(key: MasterDataKey, data: string): Promise<void>;
    registerClient(profile: ClientProfile): Promise<void>;
    registerInternal(profile: InternalProfile): Promise<void>;
    registerPartner(profile: PartnerProfile): Promise<void>;
    requestApproval(): Promise<void>;
    saveCallerUserProfile(_profile: UserRole): Promise<void>;
    setApproval(user: Principal, status: ApprovalStatus): Promise<void>;
    setKonstantaUnitClient(unitKeJamPerusahaan: bigint): Promise<void>;
    setLayananV4Active(layananId: string, isActive: boolean): Promise<LayananV4>;
    setPartnerVerifiedSkills(partner: Principal, skillCodes: Array<string>): Promise<void>;
    upsertAturanBeban(kodeOpt: string | null, tipePartner: TipePartner, jamMin: bigint, jamMax: bigint, polaBeban: Variant_TAMBAH_PER_JAM_TAMBAH_JAM_TETAP, nilai: bigint, aktif: boolean): Promise<string>;
    upsertKamusPekerjaan(kodeOpt: string | null, kategoriPekerjaan: string, jenisPekerjaan: string, jamStandar: bigint, tipePartnerBoleh: Array<TipePartner>, aktif: boolean): Promise<string>;
    upsertSkillVerified(kodeOpt: string | null, nama: string, kategori: string, aktif: boolean): Promise<string>;
}
