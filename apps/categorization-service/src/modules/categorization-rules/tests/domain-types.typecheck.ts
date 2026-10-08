import { RuleId, SuggestionId, RuleExecutionId } from '../domain/value-objects';
import { IRuleExecutionRepository } from '../domain/repositories/rule-execution.repository';

// This file is included by the service's normal TypeScript check.
// Unlike a runtime test, these assertions fail if IDs become interchangeable.
type AssertFalse<T extends false> = T;
type Assignable<From, To> = From extends To ? true : false;
export type RuleCannotBeSuggestion = AssertFalse<Assignable<RuleId, SuggestionId>>;
export type SuggestionCannotBeRule = AssertFalse<Assignable<SuggestionId, RuleId>>;
export type RuleCannotBeExecution = AssertFalse<Assignable<RuleId, RuleExecutionId>>;
export type ExecutionCannotBeRule = AssertFalse<Assignable<RuleExecutionId, RuleId>>;
export type SuggestionCannotBeExecution = AssertFalse<Assignable<SuggestionId, RuleExecutionId>>;
export type ExecutionCannotBeSuggestion = AssertFalse<Assignable<RuleExecutionId, SuggestionId>>;
export type RepositoryDoesNotCoordinateEvaluation = AssertFalse<
  'saveWithSuggestion' extends keyof IRuleExecutionRepository ? true : false
>;
