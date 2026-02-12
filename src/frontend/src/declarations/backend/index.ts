// Generated backend declarations for production builds
// This file provides the IDL factory for the backend canister
// It is checked into source control to support deployments without local dfx artifacts

export const idlFactory = ({ IDL }: any) => {
  const QuizId = IDL.Text;
  const ExternalBlob = IDL.Text;
  const Question = IDL.Record({
    'text' : IDL.Text,
    'hint' : IDL.Opt(IDL.Text),
    'correctAnswer' : IDL.Nat,
    'answers' : IDL.Vec(IDL.Text),
    'studyArticle' : IDL.Opt(IDL.Text),
    'imageUrl' : IDL.Opt(ExternalBlob),
  });
  const UserRole = IDL.Variant({
    'admin' : IDL.Null,
    'user' : IDL.Null,
    'guest' : IDL.Null,
  });
  const StateSnapshot = IDL.Record({
    'version' : IDL.Nat,
    'questions' : IDL.Vec(IDL.Tuple(IDL.Text, IDL.Vec(Question))),
    'blockNames' : IDL.Vec(IDL.Tuple(IDL.Text, IDL.Vec(IDL.Tuple(IDL.Nat, IDL.Text)))),
  });
  const Article = IDL.Record({
    'title' : IDL.Text,
    'content' : IDL.Text,
  });
  const UserProfile = IDL.Record({
    'name' : IDL.Text,
  });
  const HealthCheckResult = IDL.Record({
    'systemTime' : IDL.Int,
    'backendVersion' : IDL.Nat,
  });
  
  return IDL.Service({
    'appendQuestions' : IDL.Func([QuizId, IDL.Vec(Question)], [], []),
    'assignCallerUserRole' : IDL.Func([IDL.Principal, UserRole], [], []),
    'exportAllState' : IDL.Func([], [StateSnapshot], []),
    'generateArticle' : IDL.Func([IDL.Text], [Article], []),
    'getAllBlockNames' : IDL.Func([QuizId], [IDL.Vec(IDL.Tuple(IDL.Nat, IDL.Text))], ['query']),
    'getAllQuestions' : IDL.Func([QuizId], [IDL.Vec(Question)], ['query']),
    'getArticle' : IDL.Func([IDL.Text], [Article], ['query']),
    'getBlockName' : IDL.Func([QuizId, IDL.Nat], [IDL.Opt(IDL.Text)], ['query']),
    'getCallerUserProfile' : IDL.Func([], [IDL.Opt(UserProfile)], ['query']),
    'getCallerUserRole' : IDL.Func([], [UserRole], ['query']),
    'getQuestion' : IDL.Func([QuizId, IDL.Nat], [IDL.Opt(Question)], ['query']),
    'getQuestionCount' : IDL.Func([QuizId], [IDL.Nat], ['query']),
    'getQuestions' : IDL.Func([QuizId, IDL.Nat, IDL.Nat], [IDL.Vec(Question)], ['query']),
    'getUserProfile' : IDL.Func([IDL.Principal], [IDL.Opt(UserProfile)], ['query']),
    'hasAdminRole' : IDL.Func([], [IDL.Bool], ['query']),
    'healthCheck' : IDL.Func([], [HealthCheckResult], ['query']),
    'isCallerAdmin' : IDL.Func([], [IDL.Bool], ['query']),
    'isValidQuizId' : IDL.Func([QuizId], [IDL.Bool], ['query']),
    'listAllQuizzes' : IDL.Func([], [IDL.Vec(QuizId)], ['query']),
    'pushAllArticlesToBackend' : IDL.Func([], [], []),
    'pushArticlesToContentTeam' : IDL.Func([], [], []),
    'renameQuiz' : IDL.Func([QuizId, QuizId], [], []),
    'restoreState' : IDL.Func([StateSnapshot], [], []),
    'saveCallerUserProfile' : IDL.Func([UserProfile], [], []),
    'saveQuestions' : IDL.Func([QuizId, IDL.Vec(Question)], [], []),
    'setBlockName' : IDL.Func([QuizId, IDL.Nat, IDL.Text], [], []),
    'writeArticle' : IDL.Func([IDL.Text], [], []),
  });
};
