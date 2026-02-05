import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type ListAllQuizzesResult = [QuizId, Array<QuizId>];
export interface Question {
    answers: Array<string>;
    text: string;
    correctAnswer: bigint;
}
export interface UserProfile {
    name: string;
}
export type QuizId = string;
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    appendQuestions(quizId: QuizId, newQuestions: Array<Question>): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    getAllQuestions(quizId: QuizId): Promise<Array<Question>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getQuestion(quizId: QuizId, questionId: bigint): Promise<Question | null>;
    getQuestionCount(quizId: QuizId): Promise<bigint>;
    getQuestions(quizId: QuizId, chunkSize: bigint, chunkIndex: bigint): Promise<Array<Question>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    listAllQuizzes(): Promise<ListAllQuizzesResult>;
    renameQuiz(oldQuizId: QuizId, newQuizId: QuizId): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    saveQuestions(quizId: QuizId, questionsInput: Array<Question>): Promise<void>;
}
