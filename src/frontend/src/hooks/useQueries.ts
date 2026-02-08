import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { diagnostics } from '../utils/deploymentDiagnostics';
import type { UserProfile, Question, QuizId } from '../backend';

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) {
        diagnostics.captureError(
          'Actor not available for getCallerUserProfile',
          'useGetCallerUserProfile query',
          'actorInit'
        );
        throw new Error('Actor not available');
      }
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) {
        diagnostics.captureError(
          'Actor not available for saveCallerUserProfile',
          'useSaveCallerUserProfile mutation',
          'actorInit'
        );
        throw new Error('Actor not available');
      }
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
    },
  });
}

export function useListAllQuizzes() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<[string, QuizId[]]>({
    queryKey: ['allQuizzes'],
    queryFn: async () => {
      if (!actor) {
        diagnostics.captureError(
          'Actor not available for listAllQuizzes',
          'useListAllQuizzes query',
          'actorInit'
        );
        throw new Error('Actor not available');
      }
      const quizzes = await actor.listAllQuizzes();
      return ['', quizzes] as [string, QuizId[]];
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useGetQuestionCount(quizId: QuizId) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<bigint>({
    queryKey: ['questionCount', quizId],
    queryFn: async () => {
      if (!actor) {
        diagnostics.captureError(
          'Actor not available for getQuestionCount',
          'useGetQuestionCount query',
          'actorInit'
        );
        throw new Error('Actor not available');
      }
      return actor.getQuestionCount(quizId);
    },
    enabled: !!actor && !actorFetching && !!quizId,
  });
}

export function useGetAllQuizCounts(quizIds: QuizId[]) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Record<QuizId, number>>({
    queryKey: ['allQuizCounts', quizIds.join(',')],
    queryFn: async () => {
      if (!actor) {
        diagnostics.captureError(
          'Actor not available for getAllQuizCounts',
          'useGetAllQuizCounts query',
          'actorInit'
        );
        throw new Error('Actor not available');
      }
      const counts: Record<QuizId, number> = {};
      for (const quizId of quizIds) {
        const count = await actor.getQuestionCount(quizId);
        counts[quizId] = Number(count);
      }
      return counts;
    },
    enabled: !!actor && !actorFetching && quizIds.length > 0,
  });
}

export function useGetAllQuestions(quizId: QuizId) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Question[]>({
    queryKey: ['questions', quizId],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllQuestions(quizId);
    },
    enabled: !!actor && !actorFetching,
    refetchOnWindowFocus: false,
  });
}

export function useGetQuestionChunk(quizId: QuizId, blockIndex: number, enabled: boolean = true) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Question[]>({
    queryKey: ['questionChunk', quizId, blockIndex],
    queryFn: async () => {
      if (!actor) {
        diagnostics.captureError(
          'Actor not available for getQuestionChunk',
          'useGetQuestionChunk query',
          'actorInit'
        );
        throw new Error('Actor not available');
      }
      return actor.getQuestions(quizId, BigInt(100), BigInt(blockIndex));
    },
    enabled: !!actor && !actorFetching && !!quizId && enabled,
  });
}

export function useGetFirst20Questions(quizId: QuizId, enabled: boolean = false) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Question[]>({
    queryKey: ['first20Questions', quizId],
    queryFn: async () => {
      if (!actor) {
        diagnostics.captureError(
          'Actor not available for getFirst20Questions',
          'useGetFirst20Questions query',
          'actorInit'
        );
        throw new Error('Actor not available');
      }
      return actor.getQuestions(quizId, BigInt(20), BigInt(0));
    },
    enabled: !!actor && !actorFetching && !!quizId && enabled,
  });
}

export function useGetAllBlockNames(quizId: QuizId) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Map<number, string>>({
    queryKey: ['blockNames', quizId],
    queryFn: async () => {
      if (!actor) {
        diagnostics.captureError(
          'Actor not available for getAllBlockNames',
          'useGetAllBlockNames query',
          'actorInit'
        );
        throw new Error('Actor not available');
      }
      const pairs = await actor.getAllBlockNames(quizId);
      const map = new Map<number, string>();
      pairs.forEach(([blockIndex, name]) => {
        map.set(Number(blockIndex), name);
      });
      return map;
    },
    enabled: !!actor && !actorFetching && !!quizId,
  });
}

export function useSetBlockName(quizId: QuizId) {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ blockIndex, blockName }: { blockIndex: number; blockName: string }) => {
      if (!actor) {
        diagnostics.captureError(
          'Actor not available for setBlockName',
          'useSetBlockName mutation',
          'actorInit'
        );
        throw new Error('Actor not available');
      }
      return actor.setBlockName(quizId, BigInt(blockIndex), blockName);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blockNames', quizId] });
    },
  });
}

export function useSaveQuestions(quizId: QuizId) {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (questions: Question[]) => {
      if (!actor) {
        diagnostics.captureError(
          'Actor not available for saveQuestions',
          'useSaveQuestions mutation',
          'actorInit'
        );
        throw new Error('Actor not available');
      }
      return actor.saveQuestions(quizId, questions);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions', quizId] });
      queryClient.invalidateQueries({ queryKey: ['questionCount', quizId] });
      queryClient.invalidateQueries({ queryKey: ['allQuizzes'] });
      queryClient.invalidateQueries({ queryKey: ['allQuizCounts'] });
      queryClient.invalidateQueries({ queryKey: ['first20Questions', quizId] });
      queryClient.invalidateQueries({ queryKey: ['questionChunk', quizId] });
    },
  });
}

export function useIsAdmin() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ['isAdmin'],
    queryFn: async () => {
      if (!actor) {
        diagnostics.captureError(
          'Actor not available for isAdmin check',
          'useIsAdmin query',
          'actorInit'
        );
        return false;
      }
      return actor.hasAdminRole();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });
}
