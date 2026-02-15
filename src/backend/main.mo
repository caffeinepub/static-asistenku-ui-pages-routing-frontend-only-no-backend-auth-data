import Map "mo:core/Map";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import List "mo:core/List";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import Array "mo:core/Array";
import Runtime "mo:core/Runtime";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";
import Iter "mo:core/Iter";

actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

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
  var superadminClaimed = false;

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
    AccessControl.assignRole(accessControlState, caller, caller, #admin);
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

  // -----------------------------------------------------------------------------
  // MASTER DATA ASISTENKU - SUPERADMIN ONLY
  // -----------------------------------------------------------------------------
  // THIS SECTION MUST BE LAST. DO NOT INSERT ANY CODE BELOW THIS BLOCK.

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

  // -----------------------------------------------------------------------------
  // APPENDED SECTION: User Status + Partner Level, Rate, Utilities
  // -----------------------------------------------------------------------------

  // ---------------------------------------------------------------- User Status --
  public type UserStatus = { #pending; #active; #suspended; #blacklisted };

  let RATE_JUNIOR = 35000;
  let RATE_SENIOR = 55000;
  let RATE_EXPERT = 75000;

  let userStatusByPrincipal = Map.empty<Principal, UserStatus>();

  func defaultUserStatus() : UserStatus { #pending };

  func getUserStatusInternal(principal : Principal) : UserStatus {
    switch (userStatusByPrincipal.get(principal)) {
      case (null) { defaultUserStatus() };
      case (?status) { status };
    };
  };

  func isPartnerRole(principal : Principal) : Bool {
    switch (userRoles.get(principal)) {
      case (?role) {
        switch (role) {
          case (#partner(_actor)) { true };
          case (_) { false };
        };
      };
      case (null) { false };
    };
  };

  func requireAdminOrSuperadminImpl(caller : Principal) {
    switch (userRoles.get(caller)) {
      case (?#superadmin) { () };
      case (?#internal(profile)) {
        switch (profile.role) {
          case (#admin) { () };
          case (_) { Runtime.trap("Permission denied. Only admin or superadmin can perform this action.") };
        };
      };
      case (_) { Runtime.trap("Permission denied. Only admin or superadmin can perform this action") };
    };
  };

  public shared ({ caller }) func setUserStatus(target : Principal, status : UserStatus) : async () {
    requireAdminOrSuperadminImpl(caller);
    userStatusByPrincipal.add(target, status);
  };

  public query ({ caller }) func getMyUserStatus() : async UserStatus {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthenticated: Only authenticated users can get their own status information");
    };
    if (not userRoles.containsKey(caller)) {
      Runtime.trap("Unauthorized: User must be registered to view status");
    };
    getUserStatusInternal(caller);
  };

  public query ({ caller }) func getUserStatus(user : Principal) : async UserStatus {
    requireAdminOrSuperadminImpl(caller);
    getUserStatusInternal(user);
  };

  public query ({ caller }) func listUsersByStatus(status : UserStatus) : async [Principal] {
    requireAdminOrSuperadminImpl(caller);
    let result = List.empty<Principal>();

    for (check in userStatusByPrincipal.entries()) {
      if (check.1 == status) {
        result.add(check.0);
      };
    };

    result.toArray();
  };

  // --------------------------------------------------------- Hourly Rate + Level --
  let partnerLevelByPrincipal = Map.empty<Principal, TipePartner>();

  public shared ({ caller }) func setPartnerLevel(partner : Principal, level : TipePartner) : async () {
    requireAdminOrSuperadminImpl(caller);

    if (not isPartnerRole(partner)) {
      Runtime.trap("Target is not a valid partner. Only partners can have a partner level, cannot assign level to client or internal users.");
    };
    partnerLevelByPrincipal.add(partner, level);
  };

  public query ({ caller }) func getMyPartnerLevel() : async TipePartner {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthenticated: Only partners can get partner level");
    };
    if (not isPartnerRole(caller)) {
      Runtime.trap("Invalid role: Only partners can get partner level, caller is not a valid partner");
    };
    switch (partnerLevelByPrincipal.get(caller)) {
      case (null) { #junior };
      case (?level) { level };
    };
  };

  public query ({ caller }) func getPartnerLevel(partner : Principal) : async TipePartner {
    requireAdminOrSuperadminImpl(caller);
    switch (partnerLevelByPrincipal.get(partner)) {
      case (null) { #junior };
      case (?level) { level };
    };
  };

  public query ({ caller }) func getHourlyRateByLevel(_level : TipePartner) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can view hourly rates");
    };
    switch (_level) {
      case (#junior) { RATE_JUNIOR };
      case (#senior) { RATE_SENIOR };
      case (#expert) { RATE_EXPERT };
    };
  };

  public query ({ caller }) func getMyHourlyRate() : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthenticated: Only authenticated partners can get their hourly rate");
    };
    if (not isPartnerRole(caller)) {
      Runtime.trap("Invalid role: Only partners can get hourly rate");
    };
    switch (getMyPartnerLevelSync(caller)) {
      case (#junior) { RATE_JUNIOR };
      case (#senior) { RATE_SENIOR };
      case (#expert) { RATE_EXPERT };
    };
  };

  func getMyPartnerLevelSync(caller : Principal) : TipePartner {
    switch (partnerLevelByPrincipal.get(caller)) {
      case (null) { #junior };
      case (?level) { level };
    };
  };

  // ----------------------------------------------------------------- UserId Util --
  public query ({ caller }) func getUserIdByPrincipal(target : Principal) : async ?Text {
    requireAdminOrSuperadminImpl(caller);
    userIdByPrincipal.get(target);
  };

  public query ({ caller }) func listUsersBasic(roleFilter : Text) : async [(Principal, Text, Text, UserStatus)] {
    requireAdminOrSuperadminImpl(caller);
    let result = List.empty<(Principal, Text, Text, UserStatus)>();

    for ((principal, roleEntry) in userRoles.entries()) {
      let roleText = switch (roleEntry) {
        case (#client(_actor)) { "client" };
        case (#partner(_actor)) { "partner" };
        case (#internal(_actor)) { "internal" };
        case (#superadmin) { "superadmin" };
      };

      switch (userIdByPrincipal.get(principal)) {
        case (null) { () };
        case (?userId) {
          if (roleFilter == "" or roleText == roleFilter) {
            let status = getUserStatusInternal(principal);
            result.add((principal, userId, roleText, status));
          };
        };
      };
    };

    result.toArray();
  };

  public query ({ caller }) func getRates() : async (Nat, Nat, Nat) {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can view hourly rates");
    };
    (RATE_JUNIOR, RATE_SENIOR, RATE_EXPERT);
  };

  //--------------------------------------------------------------------------------------------------------------------
  // APPENDED SECTION - MASTER DATA LAYANAN (Full CRUD)
  //--------------------------------------------------------------------------------------------------------------------

  type LayananType = {
    #VirtualAssistant;
    #LegalServices;
    #BusinessConsulting;
    #FinancialPlanning;
    #DigitalMarketing;
    #Other : Text;
  };

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

  var layananCounter = 0;
  let layananById = Map.empty<Text, LayananAsistenku>();
  let layananIdsByClient = Map.empty<Principal, List.List<Text>>();

  func repeatN(character : Text, count : Nat) : Text {
    var result = "";
    var current = 0;
    while (current < count) {
      result #= character;
      current += 1;
    };
    result;
  };

  func nextLayananId() : Text {
    layananCounter += 1;
    let idNumber = layananCounter.toText();
    let paddingNeeded = Int.abs(6 - idNumber.size().toInt());
    let padded = "LAY-".concat(idNumber);
    let padding = repeatN("0", paddingNeeded);
    "LAY-".concat(padding.concat(idNumber));
  };

  public shared ({ caller }) func createLayananForClient(name : Text, description : Text, type_ : LayananType, price : Nat) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can create layanan");
    };

    let id = nextLayananId();
    let layanan : LayananAsistenku = {
      id;
      name;
      description;
      type_;
      price;
      active = false;
      createdBy = caller;
      createdAt = Time.now();
      updatedBy = null;
      updatedAt = null;
    };

    layananById.add(id, layanan);

    switch (layananIdsByClient.get(caller)) {
      case (null) {
        let empty = List.empty<Text>();
        empty.add(id);
        layananIdsByClient.add(caller, empty);
      };
      case (?list) {
        list.add(id);
      };
    };

    id;
  };

  public shared ({ caller }) func setLayananActive(layananId : Text) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admin users can set active");
    };

    let oldLayanan = switch (layananById.get(layananId)) {
      case (null) {
        Runtime.trap("Layanan not found with id: " # layananId);
      };
      case (?layanan) { layanan };
    };

    let updatedLayanan : LayananAsistenku = {
      oldLayanan with active = true;
      updatedBy = ?caller;
      updatedAt = ?Time.now();
    };

    layananById.add(layananId, updatedLayanan);
  };

  public query ({ caller }) func listMyLayanan() : async [LayananAsistenku] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can list previously created layanan");
    };

    switch (layananIdsByClient.get(caller)) {
      case (null) { [] };
      case (?list) {
        let idsArray = list.toArray();
        let resultList = List.empty<LayananAsistenku>();

        for (id in idsArray.values()) {
          switch (layananById.get(id)) {
            case (?layanan) {
              resultList.add(layanan);
            };
            case (null) { () };
          };
        };
        resultList.toArray();
      };
    };
  };

  // --- LAYANAN ASISTENKU V2 (APPEND ONLY, NO MIGRATION) ---

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

  let layananMetaById = Map.empty<Text, LayananMeta>();
  let layananIdsByOwnerClient = Map.empty<Principal, [Text]>();

  // Helper for checking existence
  func arrayContains(array : [Text], value : Text) : Bool {
    switch (array.find(func(x) { x == value })) {
      case (?_value) { true };
      case (null) { false };
    };
  };

  public shared ({ caller }) func createLayananForClientV2(ownerClient : Principal, layananId : Text, unitTotal : Nat) : async Text {
    requireAdminOrSuperadminImpl(caller);

    if (not layananById.containsKey(layananId)) {
      return "LAYANAN_NOT_FOUND";
    };

    let newMeta : LayananMeta = {
      ownerClient;
      layananId;
      unitTotal;
      unitUsed = 0;
      unitOnHold = 0;
      isActive = true;
      createdAt = now();
      updatedAt = now();
    };

    layananMetaById.add(layananId, newMeta);

    let currentIds = switch (layananIdsByOwnerClient.get(ownerClient)) {
      case (null) { [] };
      case (?ids) { ids };
    };

    if (not arrayContains(currentIds, layananId)) {
      layananIdsByOwnerClient.add(ownerClient, currentIds.concat([layananId]));
    };

    "OK";
  };

  public shared ({ caller }) func setLayananActiveV2(layananId : Text, isActive : Bool) : async Text {
    requireAdminOrSuperadminImpl(caller);

    switch (layananMetaById.get(layananId)) {
      case (null) { "NOT_FOUND" };
      case (?existingMeta) {
        let updatedMeta : LayananMeta = {
          existingMeta with
          isActive = isActive;
          updatedAt = now();
        };
        layananMetaById.add(layananId, updatedMeta);
        "OK";
      };
    };
  };

  public query ({ caller }) func listMyLayananV2() : async [Text] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can list their own layanan");
    };

    switch (layananIdsByOwnerClient.get(caller)) {
      case (null) { [] };
      case (?ids) { ids };
    };
  };

  public query ({ caller }) func getLayananMeta(layananId : Text) : async ?LayananMeta {
    requireAdminOrSuperadminImpl(caller);
    layananMetaById.get(layananId);
  };

  public query ({ caller }) func getMyLayananMeta(layananId : Text) : async ?LayananMeta {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can access this endpoint");
    };

    switch (layananMetaById.get(layananId)) {
      case (null) { null };
      case (?meta) {
        if (meta.ownerClient != caller) {
          null;
        } else {
          ?meta;
        };
      };
    };
  };
};
