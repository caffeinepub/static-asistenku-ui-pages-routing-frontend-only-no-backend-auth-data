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
export interface PartnerProfile {
    keahlian: string;
    name: string;
    whatsapp: string;
    email: string;
    domisili: string;
}
export interface InternalProfile {
    name: string;
    role: InternalRole;
    whatsapp: string;
    email: string;
}
export interface ClientProfile {
    name: string;
    whatsapp: string;
    email: string;
    company: string;
}
export enum InternalRole {
    admin = "admin",
    finance = "finance",
    concierge = "concierge",
    asistenmu = "asistenmu"
}
export enum UserRole__1 {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole__1): Promise<void>;
    claimSuperadmin(): Promise<void>;
    getAllUsers(): Promise<Array<[Principal, UserRole]>>;
    getCallerUser(): Promise<UserRole | null>;
    getCallerUserProfile(): Promise<UserRole | null>;
    getCallerUserRole(): Promise<UserRole__1>;
    getMyUserId(): Promise<string | null>;
    getUser(callerPrincipal: Principal): Promise<UserRole | null>;
    getUserProfile(user: Principal): Promise<UserRole | null>;
    isCallerAdmin(): Promise<boolean>;
    registerClient(profile: ClientProfile): Promise<void>;
    registerInternal(profile: InternalProfile): Promise<void>;
    registerPartner(profile: PartnerProfile): Promise<void>;
    saveCallerUserProfile(_profile: UserRole): Promise<void>;
}
