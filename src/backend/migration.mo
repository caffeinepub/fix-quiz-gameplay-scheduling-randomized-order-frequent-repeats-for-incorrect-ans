import Map "mo:core/Map";
import Storage "blob-storage/Storage";
import AccessControl "authorization/access-control";

module {
  type OldActor = {
    accessControlState : AccessControl.AccessControlState;
    userProfiles : Map.Map<Principal, {
      name : Text;
    }>;
    quizSets : Map.Map<Text, [Question]>;
    blockNames : Map.Map<Text, Map.Map<Nat, Text>>;
    articles : Map.Map<Text, Map.Map<Nat, Article>>;
  };

  type NewActor = {
    accessControlState : AccessControl.AccessControlState;
    userProfiles : Map.Map<Principal, {
      name : Text;
    }>;
    quizSets : Map.Map<Text, [Question]>;
    blockNames : Map.Map<Text, Map.Map<Nat, Text>>;
    persistentArticles : Map.Map<Text, Article>;
  };

  public type Question = {
    text : Text;
    hint : ?Text;
    imageUrl : ?Storage.ExternalBlob;
    answers : [Text];
    correctAnswer : Nat;
  };

  public type Article = {
    title : Text;
    content : Text;
  };

  public func run(old : OldActor) : NewActor {
    let blockNames = Map.empty<Text, Map.Map<Nat, Text>>();
    {
      accessControlState = old.accessControlState;
      userProfiles = old.userProfiles;
      quizSets = old.quizSets;
      blockNames;
      persistentArticles = Map.empty<Text, Article>();
    };
  };
};
