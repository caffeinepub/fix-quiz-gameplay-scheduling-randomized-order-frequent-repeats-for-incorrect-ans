import Map "mo:core/Map";
import Text "mo:core/Text";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Time "mo:core/Time";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Storage "blob-storage/Storage";
import MixinStorage "blob-storage/Mixin";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";
import Runtime "mo:core/Runtime";

actor {
  let backendVersion : Nat = 3;

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  include MixinStorage();

  public type UserProfile = {
    name : Text;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
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
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  public type Question = {
    text : Text;
    hint : ?Text;
    imageUrl : ?Storage.ExternalBlob;
    answers : [Text];
    correctAnswer : Nat;
    studyArticle : ?Text;
  };

  public type Article = {
    title : Text;
    content : Text;
  };

  public type QuizId = Text;
  public type ListAllQuizzesResult = (QuizId, [QuizId]);

  let quizSets = Map.empty<Text, [Question]>();
  let blockNames = Map.empty<Text, Map.Map<Nat, Text>>();

  let persistentArticles = Map.empty<Text, Article>();

  public query ({ caller }) func isValidQuizId(quizId : QuizId) : async Bool {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can access quiz data");
    };
    quizSets.containsKey(quizId);
  };

  public query ({ caller }) func listAllQuizzes() : async [QuizId] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can access quiz data");
    };
    quizSets.keys().toArray();
  };

  public query ({ caller }) func getQuestionCount(quizId : QuizId) : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can access quiz data");
    };
    switch (quizSets.get(quizId)) {
      case (null) { 0 };
      case (?questions) { questions.size() };
    };
  };

  public query ({ caller }) func getAllQuestions(quizId : QuizId) : async [Question] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can access quiz data");
    };
    let allQuestionSets = switch (quizSets.get(quizId)) {
      case (null) { [] };
      case (?questions) { questions };
    };
    let questionsWithArticles = allQuestionSets.map(
      func(q) {
        { q with studyArticle = q.studyArticle };
      }
    );
    questionsWithArticles;
  };

  public query ({ caller }) func getQuestions(quizId : QuizId, chunkSize : Nat, chunkIndex : Nat) : async [Question] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can access quiz data");
    };
    switch (quizSets.get(quizId)) {
      case (null) { [] };
      case (?questions) {
        let startIndex = chunkIndex * chunkSize;
        if (startIndex > questions.size()) { return [] };
        let filteredQuestions = questions.values().drop(startIndex);
        let chunk = filteredQuestions.take(chunkSize).toArray();
        let chunkWithArticles = chunk.map(
          func(q) {
            { q with studyArticle = q.studyArticle };
          }
        );
        chunkWithArticles;
      };
    };
  };

  public query ({ caller }) func getQuestion(quizId : QuizId, questionId : Nat) : async ?Question {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can access quiz data");
    };
    switch (quizSets.get(quizId)) {
      case (null) { null };
      case (?questions) {
        if (questionId >= questions.size()) {
          return null;
        };
        ?questions[questionId];
      };
    };
  };

  public query ({ caller }) func hasAdminRole() : async Bool {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can check admin role");
    };
    AccessControl.hasPermission(accessControlState, caller, #admin);
  };

  public shared ({ caller }) func saveQuestions(quizId : QuizId, questionsInput : [Question]) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can manage questions");
    };
    quizSets.add(quizId, questionsInput);
  };

  public shared ({ caller }) func appendQuestions(quizId : QuizId, newQuestions : [Question]) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can manage questions");
    };
    let existingQuestions = switch (quizSets.get(quizId)) {
      case (null) { [] : [Question] };
      case (?existing) { existing };
    };
    let existingWithArticles = existingQuestions.map(
      func(q) {
        { q with studyArticle = q.studyArticle };
      }
    );
    let combinedQuestions = existingWithArticles.concat(newQuestions);
    quizSets.add(quizId, combinedQuestions);
  };

  public shared ({ caller }) func renameQuiz(oldQuizId : QuizId, newQuizId : QuizId) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can manage quizzes");
    };
    switch (quizSets.get(oldQuizId)) {
      case (null) {
        Runtime.trap("No questions found for this quiz set");
      };
      case (?questions) {
        if (quizSets.containsKey(newQuizId)) {
          Runtime.trap("Quiz ID already exists");
        };
        quizSets.add(newQuizId, questions);
        quizSets.remove(oldQuizId);
      };
    };
  };

  public shared ({ caller }) func setBlockName(quizId : QuizId, blockIndex : Nat, blockName : Text) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can manage block names");
    };

    let quizBlockNames = switch (blockNames.get(quizId)) {
      case (null) { Map.empty<Nat, Text>() };
      case (?existing) { existing };
    };

    quizBlockNames.add(blockIndex, blockName);
    blockNames.add(quizId, quizBlockNames);
  };

  public query ({ caller }) func getAllBlockNames(quizId : QuizId) : async [(Nat, Text)] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can access block names");
    };

    let quizBlockNames = switch (blockNames.get(quizId)) {
      case (null) { Map.empty<Nat, Text>() };
      case (?existing) { existing };
    };

    quizBlockNames.toArray();
  };

  public query ({ caller }) func getBlockName(quizId : QuizId, blockIndex : Nat) : async ?Text {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can access block names");
    };

    let quizBlockNames = switch (blockNames.get(quizId)) {
      case (null) { Map.empty<Nat, Text>() };
      case (?existing) { existing };
    };

    quizBlockNames.get(blockIndex);
  };

  public type StateSnapshot = {
    version : Nat;
    questions : [(Text, [Question])];
    blockNames : [(Text, [(Nat, Text)])];
  };

  func convertQuestionsToImmutable(mutable : [(Text, [Question])]) : [(Text, [Question])] {
    mutable.map<(Text, [Question]), (Text, [Question])>(
      func((quizId, array)) { (quizId, array) }
    );
  };

  func convertBlockNamesToImmutable(mutable : [(Text, Map.Map<Nat, Text>)]) : [(Text, [(Nat, Text)])] {
    mutable.map<(Text, Map.Map<Nat, Text>), (Text, [(Nat, Text)])>(
      func((quizId, map)) {
        (quizId, map.toArray());
      }
    );
  };

  func convertQuestionsToMutable(immutable : [(Text, [Question])]) : [(Text, [Question])] {
    immutable.map<(Text, [Question]), (Text, [Question])>(
      func((quizId, array)) { (quizId, array) }
    );
  };

  func convertBlockNamesToMutable(immutable : [(Text, [(Nat, Text)])]) : [(Text, Map.Map<Nat, Text>)] {
    immutable.map<(Text, [(Nat, Text)]), (Text, Map.Map<Nat, Text>)>(
      func((quizId, innerArray)) {
        (quizId, Map.fromArray(innerArray));
      }
    );
  };

  public shared ({ caller }) func exportAllState() : async StateSnapshot {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can export state");
    };

    {
      version = 3;
      questions = convertQuestionsToImmutable(quizSets.toArray());
      blockNames = convertBlockNamesToImmutable(blockNames.toArray());
    };
  };

  public shared ({ caller }) func restoreState(exportedState : StateSnapshot) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can restore state");
    };
    if (exportedState.version > 3) {
      Runtime.trap("Unsupported export format");
    };
    quizSets.clear();
    for ((quizId, questions) in convertQuestionsToMutable(exportedState.questions).values()) {
      quizSets.add(quizId, questions);
    };
    blockNames.clear();
    for ((quizId, map) in convertBlockNamesToMutable(exportedState.blockNames).values()) {
      blockNames.add(quizId, map);
    };
  };

  public type HealthCheckResult = {
    systemTime : Int;
    backendVersion : Nat;
  };

  public query ({ caller }) func healthCheck() : async HealthCheckResult {
    {
      systemTime = Time.now();
      backendVersion;
    };
  };

  public query ({ caller }) func getArticle(articleId : Text) : async Article {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can access articles");
    };
    switch (persistentArticles.get(articleId)) {
      case (?article) { article };
      case (null) {
        let article = {
          title = "Oops! No article found.";
          content = "This is a placeholder article with no information. The real one will give you a great explanation with illustrations.";
        };
        article;
      };
    };
  };

  public shared ({ caller }) func generateArticle(questionText : Text) : async Article {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can generate articles");
    };

    switch (persistentArticles.get(questionText)) {
      case (?existingArticle) { existingArticle };
      case (null) {
        let generatedContent : Text = "
# Understanding the Question

It's important to analyze the specific requirements of the problem described as: " # questionText # ". Ensure you fully comprehend what is being asked before attempting a solution.

# Key Concepts

- Clearly define all terms used in the question.
- Identify the underlying principles involved.
- Review any relevant formulas or techniques.

# Step-by-Step Approach

1. Clarify what you need to find or prove.
2. List out all known information and assumptions.
3. Break down the problem into smaller, manageable parts.
4. Apply logical reasoning or calculations as needed.

# Common Challenges

Be cautious of potential misunderstandings or common mistakes. Take your time to thoroughly analyze each step before proceeding.

# Practice Question

Try to create a similar question and solve it using the steps outlined above. This will reinforce your understanding and help you retain the concepts learned.

# Recap

To summarize, always start by fully understanding the question, identify key concepts, and approach the problem step by step. Continuous practice will help you master these concepts.
";

        let newArticle = {
          title = "Generated Study Article: " # questionText;
          content = generatedContent;
        };

        persistentArticles.add(questionText, newArticle);

        newArticle;
      };
    };
  };

  public shared ({ caller }) func writeArticle(_questionId : Text) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can write articles");
    };
  };

  public shared ({ caller }) func pushAllArticlesToBackend() : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can push articles to backend");
    };
  };

  public shared ({ caller }) func pushArticlesToContentTeam() : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can push articles to content team");
    };
  };
};
