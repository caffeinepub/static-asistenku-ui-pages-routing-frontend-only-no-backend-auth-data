import Map "mo:core/Map";
import List "mo:core/List";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";
import UserApproval "user-approval/approval";
import Int "mo:core/Int";

actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  let approvalState = UserApproval.initState(accessControlState);

  public query ({ caller }) func isCallerApproved() : async Bool {
    AccessControl.hasPermission(accessControlState, caller, #admin) or UserApproval.isApproved(approvalState, caller);
  };

  public shared ({ caller }) func requestApproval() : async () {
    UserApproval.requestApproval(approvalState, caller);
  };

  public shared ({ caller }) func setApproval(user : Principal, status : UserApproval.ApprovalStatus) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    UserApproval.setApproval(approvalState, user, status);
  };

  public query ({ caller }) func listApprovals() : async [UserApproval.UserApprovalInfo] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    UserApproval.listApprovals(approvalState);
  };

  var nextUserId : Nat = 1;
  let userIdByPrincipal = Map.empty<Principal, Text>();

  type InternalRole = {
    #admin;
    #finance;
    #concierge;
    #asistenmu;
  };

  type UserRole = {
    #client : ClientProfile;
    #partner : PartnerProfile;
    #internal : InternalProfile;
    #superadmin;
  };

  public type ClientProfile = {
    name : Text;
    email : Text;
    whatsapp : Text;
    company : Text;
  };

  public type PartnerProfile = {
    name : Text;
    email : Text;
    whatsapp : Text;
    keahlian : Text;
    domisili : Text;
  };

  public type InternalProfile = {
    name : Text;
    email : Text;
    whatsapp : Text;
    role : InternalRole;
  };

  func genUserId() : Text {
    let id = nextUserId;
    nextUserId += 1;
    "U" # id.toText();
  };

  func ensureUserId(p : Principal) : Text {
    switch (userIdByPrincipal.get(p)) {
      case (null) {
        let next = genUserId();
        userIdByPrincipal.add(p, next);
        next;
      };
      case (?existing) { existing };
    };
  };

  let userRoles = Map.empty<Principal, UserRole>();
  stable var superadminClaimed = false;

  public shared ({ caller }) func registerClient(profile : ClientProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can register");
    };
    if (userRoles.containsKey(caller)) {
      Runtime.trap("Caller principal already registered, cannot register multiple roles.");
    };
    let entry : UserRole = #client(profile);
    ignore ensureUserId(caller);
    userRoles.add(caller, entry);
  };

  public shared ({ caller }) func registerPartner(profile : PartnerProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can register");
    };
    if (userRoles.containsKey(caller)) {
      Runtime.trap("Caller principal already registered, cannot register multiple roles.");
    };
    let entry : UserRole = #partner(profile);
    ignore ensureUserId(caller);
    userRoles.add(caller, entry);
  };

  public shared ({ caller }) func registerInternal(profile : InternalProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can register");
    };
    if (userRoles.containsKey(caller)) {
      Runtime.trap("Caller principal already registered, cannot register multiple roles.");
    };
    let entry : UserRole = #internal(profile);
    ignore ensureUserId(caller);
    userRoles.add(caller, entry);
  };

  public shared ({ caller }) func claimSuperadmin() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can claim superadmin");
    };
    if (superadminClaimed) {
      Runtime.trap("Only one superadmin is allowed to exist globally.");
    };

    if (userRoles.containsKey(caller)) {
      Runtime.trap("User already has a registered role and cannot claim superadmin status.");
    };

    ignore ensureUserId(caller);
    superadminClaimed := true;
    userRoles.add(caller, #superadmin);
    accessControlState.userRoles.add(caller, #admin);
    accessControlState.adminAssigned := true;
  };

  public query ({ caller }) func getCallerUser() : async ?UserRole {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can view their profile");
    };
    userRoles.get(caller);
  };

  public query ({ caller }) func getUser(callerPrincipal : Principal) : async ?UserRole {
    if (caller != callerPrincipal and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile unless you are an admin");
    };
    userRoles.get(callerPrincipal);
  };

  public query ({ caller }) func getAllUsers() : async [(Principal, UserRole)] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can list all users");
    };
    userRoles.toArray();
  };

  public query ({ caller }) func getMyUserId() : async ?Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can view their user ID");
    };
    userIdByPrincipal.get(caller);
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserRole {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can view their profile");
    };
    userRoles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserRole {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile unless you are an admin");
    };
    userRoles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(_profile : UserRole) : async () {
    Runtime.trap("Disabled: profile saving must use register* or admin-approved flows only.");
  };

  func isSuperadmin(caller : Principal) : Bool {
    switch (userRoles.get(caller)) {
      case (?#superadmin) { true };
      case (_) { false };
    };
  };

  func isAdmin(caller : Principal) : Bool {
    switch (userRoles.get(caller)) {
      case (?#superadmin) { true };
      case (?#internal(profile)) {
        switch (profile.role) {
          case (#admin) { true };
          case (_) { false };
        };
      };
      case (_) { false };
    };
  };

  type MasterDataKey = Text;
  var masterData = Map.empty<Text, Text>();

  func requireSuperadmin(caller : Principal) {
    switch (userRoles.get(caller)) {
      case (?#superadmin) { () };
      case (_) { Runtime.trap("Permission denied. Only superadmin can perform this action.") };
    };
  };

  public query ({ caller }) func getMasterData(key : MasterDataKey) : async Text {
    requireSuperadmin(caller);
    switch (masterData.get(key)) {
      case (?value) { value };
      case (null) { "" };
    };
  };

  public shared ({ caller }) func pushMasterData(key : MasterDataKey, data : Text) : async () {
    requireSuperadmin(caller);
    masterData.add(key, data);
  };

  public query ({ caller }) func getMasterDataMap() : async ?[(Text, Text)] {
    requireSuperadmin(caller);
    ?masterData.toArray();
  };

  type TipePartner = {
    #junior;
    #senior;
    #expert;
  };

  public type SkillVerified = {
    kode : Text;
    nama : Text;
    kategori : Text;
    aktif : Bool;
    createdAt : Int;
  };

  public type KamusPekerjaan = {
    kategoriPekerjaan : Text;
    jenisPekerjaan : Text;
    jamStandar : Nat;
    tipePartnerBoleh : [TipePartner];
    aktif : Bool;
    createdAt : Int;
  };

  public type AturanBebanPerusahaan = {
    tipePartner : TipePartner;
    jamMin : Nat;
    jamMax : Nat;
    polaBeban : {
      #TAMBAH_JAM_TETAP;
      #TAMBAH_PER_JAM;
    };
    nilai : Nat;
    aktif : Bool;
    createdAt : Int;
  };

  public type KonstantaUnitClient = {
    unitKeJamPerusahaan : Nat;
    updatedAt : Int;
  };

  var nextSkillId : Nat = 1;
  var nextKamusId : Nat = 1;
  var nextAturanId : Nat = 1;

  let skillsByKode = Map.empty<Text, SkillVerified>();
  let kamusByKode = Map.empty<Text, KamusPekerjaan>();
  let aturanByKode = Map.empty<Text, AturanBebanPerusahaan>();
  var konstantaUnit : KonstantaUnitClient = {
    unitKeJamPerusahaan = 2;
    updatedAt = 0;
  };

  let partnerSkillsByPrincipal = Map.empty<Principal, [Text]>();

  func pad4(n : Nat) : Text {
    let text = n.toText();
    switch (text.size()) {
      case (1) { "000" # text };
      case (2) { "00" # text };
      case (3) { "0" # text };
      case (_) { text };
    };
  };

  func genKode(prefix : Text, id : Nat) : Text {
    prefix # "-" # pad4(id);
  };

  func now() : Int {
    Time.now();
  };

  public shared ({ caller }) func upsertSkillVerified(kodeOpt : ?Text, nama : Text, kategori : Text, aktif : Bool) : async Text {
    requireSuperadmin(caller);
    let kode = switch (kodeOpt) {
      case (null) {
        let newKode = genKode("SKL", nextSkillId);
        nextSkillId += 1;
        newKode;
      };
      case (?existing) { existing };
    };

    switch (skillsByKode.get(kode)) {
      case (null) {
        let newSkill : SkillVerified = {
          kode;
          nama;
          kategori;
          aktif;
          createdAt = now();
        };
        skillsByKode.add(kode, newSkill);
        kode;
      };
      case (?existing) {
        let updatedSkill : SkillVerified = {
          kode;
          nama;
          kategori;
          aktif;
          createdAt = existing.createdAt;
        };
        skillsByKode.add(kode, updatedSkill);
        kode;
      };
    };
  };

  public query ({ caller }) func getSkillVerified(kode : Text) : async ?SkillVerified {
    requireSuperadmin(caller);
    skillsByKode.get(kode);
  };

  public query ({ caller }) func listSkillVerified() : async [SkillVerified] {
    requireSuperadmin(caller);
    skillsByKode.values().toArray();
  };

  public shared ({ caller }) func upsertKamusPekerjaan(kodeOpt : ?Text, kategoriPekerjaan : Text, jenisPekerjaan : Text, jamStandar : Nat, tipePartnerBoleh : [TipePartner], aktif : Bool) : async Text {
    requireSuperadmin(caller);
    let kode = switch (kodeOpt) {
      case (null) {
        let newKode = genKode("KMS", nextKamusId);
        nextKamusId += 1;
        newKode;
      };
      case (?existing) { existing };
    };

    switch (kamusByKode.get(kode)) {
      case (null) {
        let newKamus : KamusPekerjaan = {
          kategoriPekerjaan;
          jenisPekerjaan;
          jamStandar;
          tipePartnerBoleh;
          aktif;
          createdAt = now();
        };
        kamusByKode.add(kode, newKamus);
        kode;
      };
      case (?existing) {
        let updatedKamus : KamusPekerjaan = {
          kategoriPekerjaan;
          jenisPekerjaan;
          jamStandar;
          tipePartnerBoleh;
          aktif;
          createdAt = existing.createdAt;
        };
        kamusByKode.add(kode, updatedKamus);
        kode;
      };
    };
  };

  public query ({ caller }) func getKamusPekerjaan(kode : Text) : async ?KamusPekerjaan {
    requireSuperadmin(caller);
    kamusByKode.get(kode);
  };

  public query ({ caller }) func listKamusPekerjaan() : async [KamusPekerjaan] {
    requireSuperadmin(caller);
    kamusByKode.values().toArray();
  };

  public shared ({ caller }) func upsertAturanBeban(kodeOpt : ?Text, tipePartner : TipePartner, jamMin : Nat, jamMax : Nat, polaBeban : { #TAMBAH_JAM_TETAP; #TAMBAH_PER_JAM }, nilai : Nat, aktif : Bool) : async Text {
    requireSuperadmin(caller);
    let kode = switch (kodeOpt) {
      case (null) {
        let newKode = genKode("ATB", nextAturanId);
        nextAturanId += 1;
        newKode;
      };
      case (?existing) { existing };
    };

    switch (aturanByKode.get(kode)) {
      case (null) {
        let newAturan : AturanBebanPerusahaan = {
          tipePartner;
          jamMin;
          jamMax;
          polaBeban;
          nilai;
          aktif;
          createdAt = now();
        };
        aturanByKode.add(kode, newAturan);
        kode;
      };
      case (?existing) {
        let updatedAturan : AturanBebanPerusahaan = {
          tipePartner;
          jamMin;
          jamMax;
          polaBeban;
          nilai;
          aktif;
          createdAt = existing.createdAt;
        };
        aturanByKode.add(kode, updatedAturan);
        kode;
      };
    };
  };

  public query ({ caller }) func getAturanBeban(kode : Text) : async ?AturanBebanPerusahaan {
    requireSuperadmin(caller);
    aturanByKode.get(kode);
  };

  public query ({ caller }) func listAturanBeban() : async [AturanBebanPerusahaan] {
    requireSuperadmin(caller);
    aturanByKode.values().toArray();
  };

  public shared ({ caller }) func setKonstantaUnitClient(unitKeJamPerusahaan : Nat) : async () {
    requireSuperadmin(caller);
    konstantaUnit := {
      unitKeJamPerusahaan;
      updatedAt = now();
    };
  };

  public query ({ caller }) func getKonstantaUnitClient() : async KonstantaUnitClient {
    requireSuperadmin(caller);
    konstantaUnit;
  };

  public shared ({ caller }) func setPartnerVerifiedSkills(partner : Principal, skillCodes : [Text]) : async () {
    requireSuperadmin(caller);
    let validSkills = skillCodes.filter(func(code) {
      switch (skillsByKode.get(code)) {
        case (?skill) { skill.aktif };
        case (null) { false };
      };
    });

    if (validSkills.size() != skillCodes.size()) {
      Runtime.trap("One or more skill codes are not valid or not active.");
    };

    partnerSkillsByPrincipal.add(partner, validSkills);
  };

  public query ({ caller }) func getPartnerVerifiedSkills(partner : Principal) : async [Text] {
    requireSuperadmin(caller);
    switch (partnerSkillsByPrincipal.get(partner)) {
      case (?skills) { skills };
      case (null) { [] };
    };
  };

  public query ({ caller }) func listPartnerVerifiedSkills() : async [(Principal, [Text])] {
    requireSuperadmin(caller);
    partnerSkillsByPrincipal.toArray();
  };

  public shared ({ caller }) func kalkulatorAM(kodeKamus : Text, tipePartner : TipePartner, beban : Nat) : async {
    jamKePartner : Nat;
    jamPerusahaan : Nat;
    unitClient : Nat;
  } {
    requireSuperadmin(caller);

    switch (kamusByKode.get(kodeKamus)) {
      case (null) {
        Runtime.trap("Kamus Pekerjaan not found");
      };
      case (?kamus) {
        let jamStandar = kamus.jamStandar;

        let filteredAturan = aturanByKode.values().toArray().filter(
          func(aturan) {
            aturan.aktif and
            Int.greaterOrEqual(Int.fromNat(jamStandar), Int.fromNat(aturan.jamMin)) and
            (Int.fromNat(jamStandar) < Int.fromNat(aturan.jamMax) or Int.equal(Int.fromNat(jamStandar), Int.fromNat(aturan.jamMax))) and
            compareTipePartner(aturan.tipePartner, tipePartner);
          }
        );

        if (filteredAturan.size() == 0) {
          Runtime.trap("No matching Aturan Beban found");
        };

        let aturan = filteredAturan[0];
        let J = jamStandar * beban;

        let bebanInternal = switch (aturan.polaBeban) {
          case (#TAMBAH_JAM_TETAP) { aturan.nilai };
          case (#TAMBAH_PER_JAM) { aturan.nilai * jamStandar };
        };

        let jamKePartner = J;
        let jamPerusahaan = J + bebanInternal;
        let unitClient = jamPerusahaan / konstantaUnit.unitKeJamPerusahaan;

        return {
          jamKePartner;
          jamPerusahaan;
          unitClient;
        };
      };
    };
  };

  func compareTipePartner(a : TipePartner, b : TipePartner) : Bool {
    switch (a, b) {
      case (#junior, #junior) { true };
      case (#senior, #senior) { true };
      case (#expert, #expert) { true };
      case (_) { false };
    };
  };

  // State needed by now deprecated Layanan, Task, and Rate versions
  let RATE_JUNIOR = 35000;
  let RATE_SENIOR = 55000;
  let RATE_EXPERT = 75000;
  stable var layananCounter : Nat = 0;
  let layananById = Map.empty<Text, LayananAsistenku>();
  let layananIdsByClient = Map.empty<Principal, List.List<Text>>();
  let layananMetaById = Map.empty<Text, LayananMeta>();
  let layananIdsByOwnerClient = Map.empty<Principal, [Text]>();
  let layananPaketById = Map.empty<Text, LayananPaketMeta>();
  let layananIdsByPrincipal = Map.empty<Principal, [Text]>();
  let partnerLevelByPrincipal = Map.empty<Principal, TipePartner>();
  stable var taskCounter : Nat = 0;
  let taskById = Map.empty<Text, Task>();
  let taskIdsByClient = Map.empty<Principal, [Text]>();
  let taskIdsByPartner = Map.empty<Principal, [Text]>();
  let userStatusByPrincipal = Map.empty<Principal, UserStatus>();

  public type TaskPhase = {
    #permintaan_baru;
    #ditolak_partner;
    #on_progress;
    #qa_asistenku;
    #review_client;
    #revisi;
    #selesai;
    #dibatalkan_client;
  };

  public type LayananMeta = {
    ownerClient : Principal;
    layananId : Text;
    unitTotal : Nat;
    unitUsed : Nat;
    unitOnHold : Nat;
    isActive : Bool;
    createdAt : Int;
    updatedAt : Int;
  };

  public type PaketLayanan = {
    #tenang;
    #rapi;
    #fokus;
    #jaga;
  };

  public type LayananPaketMeta = {
    layananId : Text;
    ownerClient : Principal;
    paket : PaketLayanan;
    harga : Nat;
    isActive : Bool;
    sharedWith : [Principal];
    createdAt : Int;
    updatedAt : Int;
  };

  public type Task = {
    taskId : Text;
    ownerClient : Principal;
    layananId : Text;
    title : Text;
    detail : Text;
    requestType : Text;
    phase : TaskPhase;
    assignedPartner : ?Principal;
    jamEfektif : ?Nat;
    unitTerpakai : ?Nat;
    breakdownAM : ?Text;
    lastRejectReason : ?Text;
    createdAt : Int;
    updatedAt : Int;
  };

  public type UserStatus = { #pending; #active; #suspended; #blacklisted };

  public type LayananAsistenku = {
    id : Text;
    name : Text;
    description : Text;
    type_ : LayananType;
    price : Nat;
    active : Bool;
    createdBy : Principal;
    createdAt : Int;
    updatedBy : ?Principal;
    updatedAt : ?Int;
  };

  public type LayananType = {
    #VirtualAssistant;
    #LegalServices;
    #BusinessConsulting;
    #FinancialPlanning;
    #DigitalMarketing;
    #Other : Text;
  };

  // Layanan V4
  public type LayananTypeV4 = {
    #TENANG;
    #RAPI;
    #FOKUS;
    #JAGA;
    #EFEKTIF;
  };

  public type LayananV4 = {
    id : Text;
    clientPrincipal : Principal;
    tipe : LayananTypeV4;
    unitTotal : Nat;
    unitUsed : Nat;
    hargaPerUnit : Nat;
    asistenmuPrincipal : Principal;
    sharedWith : [Principal];
    isActive : Bool;
    isArchived : Bool;
    createdAt : Int;
    createdBy : Principal;
    updatedAt : Int;
    updatedBy : Principal;
  };

  var layananV4ById = Map.empty<Text, LayananV4>();
  var layananV4IdsByClient = Map.empty<Principal, [Text]>();
  stable var layananV4Counter : Nat = 0;
  stable var layananV4Store : [(Text, LayananV4)] = [];
  stable var layananV4IndexByClient : [(Principal, [Text])] = [];

  func requireInternalRoleV4(caller : Principal) {
    switch (userRoles.get(caller)) {
      case (?#superadmin) { () };
      case (?#internal(profile)) {
        switch (profile.role) {
          case (#admin) { () };
          case (#finance) { () };
          case (_) {
            Runtime.trap("Unauthorized");
          };
        };
      };
      case (_) {
        Runtime.trap("Unauthorized");
      };
    };
  };

  func nextLayananIdV4() : Text {
    layananV4Counter += 1;
    "LV4-" # layananV4Counter.toText();
  };

  func appendLayananIdClientIndexV4(id : Text, client : Principal) {
    let current = switch (layananV4IdsByClient.get(client)) {
      case (?arr) { arr };
      case (null) { [] };
    };
    layananV4IdsByClient.add(client, current.concat([id]));
  };

  func removeLayananIdClientIndexV4(id : Text, client : Principal) {
    let current = switch (layananV4IdsByClient.get(client)) {
      case (?arr) { arr };
      case (null) { [] };
    };
    let newArray = current.filter(func(x) { x != id });
    layananV4IdsByClient.add(client, newArray);
  };

  public shared ({ caller }) func createLayananV4(input : {
    clientPrincipal : Principal;
    tipe : LayananTypeV4;
    unitTotal : Nat;
    hargaPerUnit : Nat;
    asistenmuPrincipal : Principal;
    sharedWith : [Principal];
    isActive : ?Bool;
  }) : async LayananV4 {
    requireInternalRoleV4(caller);

    let id = nextLayananIdV4();
    let timestamp = Time.now();
    let isActiveValue = switch (input.isActive) {
      case (?val) { val };
      case (null) { true };
    };

    let newLayanan : LayananV4 = {
      id;
      clientPrincipal = input.clientPrincipal;
      tipe = input.tipe;
      unitTotal = input.unitTotal;
      unitUsed = 0;
      hargaPerUnit = input.hargaPerUnit;
      asistenmuPrincipal = input.asistenmuPrincipal;
      sharedWith = input.sharedWith;
      isActive = isActiveValue;
      isArchived = false;
      createdAt = timestamp;
      createdBy = caller;
      updatedAt = timestamp;
      updatedBy = caller;
    };

    layananV4ById.add(id, newLayanan);
    appendLayananIdClientIndexV4(id, input.clientPrincipal);
    newLayanan;
  };

  public shared ({ caller }) func editLayananV4(layananId : Text, patch : {
    clientPrincipal : ?Principal;
    tipe : ?LayananTypeV4;
    unitTotal : ?Nat;
    hargaPerUnit : ?Nat;
    asistenmuPrincipal : ?Principal;
    sharedWith : ?[Principal];
    isActive : ?Bool;
  }) : async LayananV4 {
    requireInternalRoleV4(caller);

    switch (layananV4ById.get(layananId)) {
      case (null) {
        Runtime.trap("Not found");
      };
      case (?existing) {
        if (existing.isArchived) {
          Runtime.trap("Not found");
        };

        let newUnitTotal = switch (patch.unitTotal) {
          case (?val) { val };
          case (null) { existing.unitTotal };
        };

        if (newUnitTotal < existing.unitUsed) {
          Runtime.trap("unitTotal cannot be less than unitUsed");
        };

        let newClientPrincipal = switch (patch.clientPrincipal) {
          case (?val) { val };
          case (null) { existing.clientPrincipal };
        };

        if (newClientPrincipal != existing.clientPrincipal) {
          removeLayananIdClientIndexV4(layananId, existing.clientPrincipal);
          appendLayananIdClientIndexV4(layananId, newClientPrincipal);
        };

        let updated : LayananV4 = {
          id = existing.id;
          clientPrincipal = newClientPrincipal;
          tipe = switch (patch.tipe) {
            case (?val) { val };
            case (null) { existing.tipe };
          };
          unitTotal = newUnitTotal;
          unitUsed = existing.unitUsed;
          hargaPerUnit = switch (patch.hargaPerUnit) {
            case (?val) { val };
            case (null) { existing.hargaPerUnit };
          };
          asistenmuPrincipal = switch (patch.asistenmuPrincipal) {
            case (?val) { val };
            case (null) { existing.asistenmuPrincipal };
          };
          sharedWith = switch (patch.sharedWith) {
            case (?val) { val };
            case (null) { existing.sharedWith };
          };
          isActive = switch (patch.isActive) {
            case (?val) { val };
            case (null) { existing.isActive };
          };
          isArchived = existing.isArchived;
          createdAt = existing.createdAt;
          createdBy = existing.createdBy;
          updatedAt = Time.now();
          updatedBy = caller;
        };

        layananV4ById.add(layananId, updated);
        updated;
      };
    };
  };

  public shared ({ caller }) func setLayananV4Active(layananId : Text, isActive : Bool) : async LayananV4 {
    requireInternalRoleV4(caller);

    switch (layananV4ById.get(layananId)) {
      case (null) {
        Runtime.trap("Not found");
      };
      case (?existing) {
        if (existing.isArchived) {
          Runtime.trap("Not found");
        };

        let updated : LayananV4 = {
          existing with
          isActive;
          updatedAt = Time.now();
          updatedBy = caller;
        };

        layananV4ById.add(layananId, updated);
        updated;
      };
    };
  };

  public shared ({ caller }) func archiveLayananV4(layananId : Text) : async LayananV4 {
    requireInternalRoleV4(caller);

    switch (layananV4ById.get(layananId)) {
      case (null) {
        Runtime.trap("Not found");
      };
      case (?existing) {
        let updated : LayananV4 = {
          existing with
          isArchived = true;
          isActive = false;
          updatedAt = Time.now();
          updatedBy = caller;
        };

        layananV4ById.add(layananId, updated);
        updated;
      };
    };
  };

  public query ({ caller }) func listAllLayananV4(includeArchived : Bool) : async [LayananV4] {
    requireInternalRoleV4(caller);

    let allLayanan = layananV4ById.values().toArray();
    if (includeArchived) {
      allLayanan;
    } else {
      allLayanan.filter(func(l) { not l.isArchived });
    };
  };

  public query ({ caller }) func listLayananV4ByClient(clientPrincipal : Principal, includeArchived : Bool) : async [LayananV4] {
    requireInternalRoleV4(caller);

    let ids = switch (layananV4IdsByClient.get(clientPrincipal)) {
      case (?arr) { arr };
      case (null) { [] };
    };

    let result = List.empty<LayananV4>();
    for (id in ids.values()) {
      switch (layananV4ById.get(id)) {
        case (?layanan) {
          if (includeArchived or not layanan.isArchived) {
            result.add(layanan);
          };
        };
        case (null) {};
      };
    };

    result.toArray();
  };

  system func preupgrade() {
    layananV4Store := layananV4ById.toArray();
    layananV4IndexByClient := layananV4IdsByClient.toArray();
  };

  system func postupgrade() {
    layananV4ById := Map.fromIter<Text, LayananV4>(layananV4Store.values());
    layananV4IdsByClient := Map.fromIter<Principal, [Text]>(layananV4IndexByClient.values());
  };
};
