import Map "mo:core/Map";
import Principal "mo:core/Principal";

module {
  type OldInternalRole = {
    #admin;
    #finance;
    #concierge;
    #asistenmu;
    #superadmin;
  };

  type OldInternalProfile = {
    name : Text;
    email : Text;
    whatsapp : Text;
    role : OldInternalRole;
  };

  type OldUserRole = {
    #client : {
      name : Text;
      email : Text;
      whatsapp : Text;
      company : Text;
    };
    #partner : {
      name : Text;
      email : Text;
      whatsapp : Text;
      keahlian : Text;
      domisili : Text;
    };
    #internal : OldInternalProfile;
    #superadmin;
  };

  type OldActor = {
    userRoles : Map.Map<Principal, OldUserRole>;
    nextUserId : Nat;
    superadminClaimed : Bool;
  };

  type InternalRole = {
    #admin;
    #finance;
    #concierge;
    #asistenmu;
  };

  type InternalProfile = {
    name : Text;
    email : Text;
    whatsapp : Text;
    role : InternalRole;
  };

  type UserRole = {
    #client : {
      name : Text;
      email : Text;
      whatsapp : Text;
      company : Text;
    };
    #partner : {
      name : Text;
      email : Text;
      whatsapp : Text;
      keahlian : Text;
      domisili : Text;
    };
    #internal : InternalProfile;
    #superadmin;
  };

  type Actor = {
    userIdByPrincipal : Map.Map<Principal, Text>;
    userRoles : Map.Map<Principal, UserRole>;
    nextUserId : Nat;
    superadminClaimed : Bool;
  };

  public func run(old : OldActor) : Actor {
    let newUserRoles = old.userRoles.map<Principal, OldUserRole, UserRole>(
      func(_p, oldUserRole) {
        switch (oldUserRole) {
          case (#internal(internalProfile)) {
            let newRole = switch (internalProfile.role) {
              case (#admin) { #admin };
              case (#finance) { #finance };
              case (#concierge) { #concierge };
              case (#asistenmu) { #asistenmu };
              case (#superadmin) { #admin };
            };
            let newProfile = { internalProfile with role = newRole };
            #internal(newProfile);
          };
        };
      }
    );
    {
      userIdByPrincipal = Map.empty<Principal, Text>();
      userRoles = newUserRoles;
      nextUserId = old.nextUserId;
      superadminClaimed = old.superadminClaimed;
    };
  };
};
