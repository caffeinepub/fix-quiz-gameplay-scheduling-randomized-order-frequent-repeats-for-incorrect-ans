import Map "mo:core/Map";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";

module {
  type OldActor = {
    quizSets : Map.Map<Principal, Map.Map<Text, [Question]>>;
    userProfiles : Map.Map<Principal, { name : Text }>;
  };

  type Question = {
    text : Text;
    answers : [Text];
    correctAnswer : Nat;
  };

  type NewActor = {
    quizSets : Map.Map<Principal, Map.Map<Text, [Question]>>;
    userProfiles : Map.Map<Principal, { name : Text }>;
  };

  public func run(old : OldActor) : NewActor {
    old;
  };
};
