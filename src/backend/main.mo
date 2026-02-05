import Map "mo:core/Map";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import Migration "migration";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

// Backward migration (with full path due to code generation) and forward migration (empty) are required to prevent loss of persistent state during upgrades. Do not remove.
(with migration = Migration.run)
actor {
  // Initialize the user system state
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  public type UserProfile = {
    name : Text;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  public type Questions = [Question];
  public type Question = {
    text : Text;
    answers : [Text];
    correctAnswer : Nat;
  };

  public type QuizId = Text;
  public type ListAllQuizzesResult = (QuizId, [QuizId]);
  public type ListAllQuizzesInput = Principal;

  let quizSets = Map.empty<Principal, Map.Map<Text, [Question]>>();

  // New block names state variable; Mapping: Principal (User) -> QuizId -> BlockIndex -> BlockName (Text)
  let blockNames = Map.empty<Principal, Map.Map<Text, Map.Map<Nat, Text>>>();

  public query ({ caller }) func listAllQuizzes() : async ListAllQuizzesResult {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can access quiz data");
    };
    let results : [Text] = switch (quizSets.get(caller)) {
      case (null) { [] };
      case (?questionsSetsMap) {
        questionsSetsMap.keys().toArray();
      };
    };
    (caller.toText(), results);
  };

  public query ({ caller }) func getQuestionCount(quizId : QuizId) : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can access quiz data");
    };
    switch (quizSets.get(caller)) {
      case (null) { 0 };
      case (?questionsSetsMap) {
        switch (questionsSetsMap.get(quizId)) {
          case (null) { 0 };
          case (?questions) { questions.size() };
        };
      };
    };
  };

  public query ({ caller }) func getAllQuestions(quizId : QuizId) : async [Question] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can access quiz data");
    };
    switch (quizSets.get(caller)) {
      case (null) { [] };
      case (?questionsSetsMap) {
        switch (questionsSetsMap.get(quizId)) {
          case (null) { [] };
          case (?questions) { questions };
        };
      };
    };
  };

  public query ({ caller }) func getQuestions(quizId : QuizId, chunkSize : Nat, chunkIndex : Nat) : async [Question] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can access quiz data");
    };
    switch (quizSets.get(caller)) {
      case (null) { [] };
      case (?questionsSetsMap) {
        switch (questionsSetsMap.get(quizId)) {
          case (null) { [] };
          case (?questions) {
            let startIndex = chunkIndex * chunkSize;
            if (startIndex > questions.size()) { return [] };
            let filteredQuestions = questions.values().drop(startIndex);
            filteredQuestions.take(chunkSize).toArray();
          };
        };
      };
    };
  };

  public query ({ caller }) func getQuestion(quizId : QuizId, questionId : Nat) : async ?Question {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access quiz data");
    };
    switch (quizSets.get(caller)) {
      case (null) { null };
      case (?questionSetsMap) {
        switch (questionSetsMap.get(quizId)) {
          case (null) { null };
          case (?questions) {
            if (questionId >= questions.size()) {
              return null;
            };
            ?questions[questionId];
          };
        };
      };
    };
  };

  public shared ({ caller }) func saveQuestions(quizId : QuizId, questionsInput : [Question]) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can save questions");
    };
    let newQuestionsMap = switch (quizSets.get(caller)) {
      case (null) { Map.empty<QuizId, Questions>() };
      case (?existingQuestionsMap) { existingQuestionsMap };
    };
    newQuestionsMap.add(quizId, questionsInput);
    quizSets.add(caller, newQuestionsMap);
  };

  public shared ({ caller }) func appendQuestions(quizId : QuizId, newQuestions : [Question]) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can modify questions");
    };
    let newQuestionsMap = switch (quizSets.get(caller)) {
      case (null) { Map.empty<QuizId, Questions>() };
      case (?existingQuestionsMap) { existingQuestionsMap };
    };
    let existingQuestions = switch (newQuestionsMap.get(quizId)) {
      case (null) { [] : [Question] };
      case (?existing) { existing };
    };
    let combinedQuestions = existingQuestions.concat(newQuestions);
    newQuestionsMap.add(quizId, combinedQuestions);
    quizSets.add(caller, newQuestionsMap);
  };

  public shared ({ caller }) func renameQuiz(oldQuizId : QuizId, newQuizId : QuizId) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can modify questions");
    };
    let preparedQuestionsMap = switch (quizSets.get(caller)) {
      case (null) { Map.empty<QuizId, Questions>() };
      case (?existingQuestionsMap) { existingQuestionsMap };
    };
    switch (preparedQuestionsMap.get(oldQuizId)) {
      case (null) {
        Runtime.trap("No questions found for this quiz set");
      };
      case (?questions) {
        if (preparedQuestionsMap.containsKey(newQuizId)) {
          Runtime.trap("Quiz ID already exists");
        };
        preparedQuestionsMap.add(newQuizId, questions);
        preparedQuestionsMap.remove(oldQuizId);
        quizSets.add(caller, preparedQuestionsMap);
      };
    };
  };

  // Save or update a block name for a specific quiz and block index
  public shared ({ caller }) func setBlockName(quizId : QuizId, blockIndex : Nat, blockName : Text) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can save block names");
    };

    let userBlockNames = switch (blockNames.get(caller)) {
      case (null) { Map.empty<QuizId, Map.Map<Nat, Text>>() };
      case (?existing) { existing };
    };

    let quizBlockNames = switch (userBlockNames.get(quizId)) {
      case (null) { Map.empty<Nat, Text>() };
      case (?existing) { existing };
    };

    quizBlockNames.add(blockIndex, blockName);
    userBlockNames.add(quizId, quizBlockNames);
    blockNames.add(caller, userBlockNames);
  };

  // Retrieve all block names for a specific quiz
  public query ({ caller }) func getAllBlockNames(quizId : QuizId) : async [(Nat, Text)] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can access block names");
    };

    let userBlockNames = switch (blockNames.get(caller)) {
      case (null) { Map.empty<QuizId, Map.Map<Nat, Text>>() };
      case (?existing) { existing };
    };

    switch (userBlockNames.get(quizId)) {
      case (null) { [] };
      case (?quizBlockNames) {
        let pairs = quizBlockNames.toArray();
        pairs;
      };
    };
  };

  // Get a specific block name for a quiz and block index
  public query ({ caller }) func getBlockName(quizId : QuizId, blockIndex : Nat) : async ?Text {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can access block names");
    };

    let userBlockNames = switch (blockNames.get(caller)) {
      case (null) { Map.empty<QuizId, Map.Map<Nat, Text>>() };
      case (?existing) { existing };
    };

    switch (userBlockNames.get(quizId)) {
      case (null) { null };
      case (?quizBlockNames) {
        quizBlockNames.get(blockIndex);
      };
    };
  };
};
