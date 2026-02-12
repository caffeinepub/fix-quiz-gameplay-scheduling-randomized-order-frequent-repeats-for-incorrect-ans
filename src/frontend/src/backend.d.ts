import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export type QuizId = string;
export interface HealthCheckResult {
    backendVersion: bigint;
    systemTime: bigint;
}
export interface Article {
    title: string;
    content: string;
}
export interface Question {
    answers: Array<string>;
    hint?: string;
    text: string;
    correctAnswer: bigint;
    studyArticle?: string;
    imageUrl?: ExternalBlob;
}
export interface UserProfile {
    name: string;
}
export interface StateSnapshot {
    blockNames: Array<[string, Array<[bigint, string]>]>;
    version: bigint;
    questions: Array<[string, Array<Question>]>;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    appendQuestions(quizId: QuizId, newQuestions: Array<Question>): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    exportAllState(): Promise<StateSnapshot>;
    generateArticle(questionText: string): Promise<Article>;
    getAllBlockNames(quizId: QuizId): Promise<Array<[bigint, string]>>;
    getAllQuestions(quizId: QuizId): Promise<Array<Question>>;
    getArticle(articleId: string): Promise<Article>;
    getBlockName(quizId: QuizId, blockIndex: bigint): Promise<string | null>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getQuestion(quizId: QuizId, questionId: bigint): Promise<Question | null>;
    getQuestionCount(quizId: QuizId): Promise<bigint>;
    getQuestions(quizId: QuizId, chunkSize: bigint, chunkIndex: bigint): Promise<Array<Question>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    hasAdminRole(): Promise<boolean>;
    healthCheck(): Promise<HealthCheckResult>;
    isCallerAdmin(): Promise<boolean>;
    isValidQuizId(quizId: QuizId): Promise<boolean>;
    listAllQuizzes(): Promise<Array<QuizId>>;
    pushAllArticlesToBackend(): Promise<void>;
    pushArticlesToContentTeam(): Promise<void>;
    renameQuiz(oldQuizId: QuizId, newQuizId: QuizId): Promise<void>;
    restoreState(exportedState: StateSnapshot): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    saveQuestions(quizId: QuizId, questionsInput: Array<Question>): Promise<void>;
    setBlockName(quizId: QuizId, blockIndex: bigint, blockName: string): Promise<void>;
    writeArticle(_questionId: string): Promise<void>;
}
