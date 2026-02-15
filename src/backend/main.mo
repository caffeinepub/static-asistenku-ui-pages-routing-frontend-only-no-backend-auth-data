import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";
import Migration "migration";

(with migration = Migration.run)
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
    // userId type not kept in persistent record for maximal compatibility
    name : Text;
    email : Text;
    whatsapp : Text;
    company : Text;
  };

  public type PartnerProfile = {
    // userId type not kept in persistent record for maximal compatibility
    name : Text;
    email : Text;
    whatsapp : Text;
    keahlian : Text;
    domisili : Text;
  };

  public type InternalProfile = {
    // userId type not kept in persistent record for maximal compatibility
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

  // Only non-persistent operations use userId, so persistent state is fully compatible long-term
  // User Registration Functions - Require at least user permission

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

  // Superadmin claiming: Only first claim succeeds. Requires user permission.
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
    // Assign admin role in AccessControl system as well
    AccessControl.assignRole(accessControlState, caller, caller, #admin);
  };

  // User Queries

  public query ({ caller }) func getCallerUser() : async ?UserRole {
    // Any authenticated user can view their own profile, no additional check needed
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

  // Required profile functions for frontend compatibility
  public query ({ caller }) func getMyUserId() : async ?Text {
    userIdByPrincipal.get(caller);
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserRole {
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

  // Helper function to check if caller is superadmin (application-specific)
  func isSuperadmin(caller : Principal) : Bool {
    switch (userRoles.get(caller)) {
      case (?#superadmin) { true };
      case (_) { false };
    };
  };

  // Helper function to check if caller is admin (application-specific, supplements AccessControl)
  func isAdmin(caller : Principal) : Bool {
    switch (userRoles.get(caller)) {
      case (?#superadmin) { true };
      case (?#internal(profile)) {
        switch (profile.role) {
          case (#admin) { true };
          case (#superadmin) { true };
          case (_) { false };
        };
      };
      case (_) { false };
    };
  };
};
