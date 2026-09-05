import { describe, it, expect } from 'vitest';
import {
  Email,
  UserId,
  WorkspaceId,
  MembershipId,
  InvitationId,
} from '../domain/value-objects';
import { EmptyFieldError, InvalidFormatError } from '@core/domain/domain-error';

describe('Identity & Workspace Value Objects (Unit Tests)', () => {
  const VALID_UUID = '123e4567-e89b-42d3-a456-426614174000';
  const ANOTHER_UUID = '987fcdeb-51a2-43d7-9876-543210987654';

  describe('Email Value Object', () => {
    it('should create and normalize valid email', () => {
      const email = Email.create('  John.Doe@Example.COM  ');
      expect(email.getValue()).toBe('john.doe@example.com');
      expect(email.toString()).toBe('john.doe@example.com');
      expect(email.toJSON()).toBe('john.doe@example.com');
    });

    it('should throw EmptyFieldError on empty email', () => {
      expect(() => Email.create('')).toThrow(EmptyFieldError);
      expect(() => Email.fromString('')).toThrow(EmptyFieldError);
    });

    it('should throw InvalidFormatError on invalid email format', () => {
      expect(() => Email.create('not-an-email')).toThrow(InvalidFormatError);
      expect(() => Email.create('user@')).toThrow(InvalidFormatError);
      expect(() => Email.create('@domain.com')).toThrow(InvalidFormatError);
    });

    it('should throw InvalidFormatError when email exceeds 254 characters', () => {
      const longLocal = 'a'.repeat(250);
      expect(() => Email.create(`${longLocal}@example.com`)).toThrow(InvalidFormatError);
    });

    it('should correctly evaluate Email.isValid static method', () => {
      expect(Email.isValid('user@domain.com')).toBe(true);
      expect(Email.isValid('invalid-email')).toBe(false);
      expect(Email.isValid('')).toBe(false);
      expect(Email.isValid('a'.repeat(250) + '@example.com')).toBe(false);
    });

    it('should compare emails correctly with equals()', () => {
      const email1 = Email.create('user@example.com');
      const email2 = Email.create('USER@example.com');
      const email3 = Email.create('other@example.com');

      expect(email1.equals(email2)).toBe(true);
      expect(email1.equals(email3)).toBe(false);
      expect(email1.equals(null)).toBe(false);
      expect(email1.equals(undefined)).toBe(false);
    });
  });

  describe('UserId Value Object', () => {
    it('should generate valid UUID with create()', () => {
      const userId = UserId.create();
      expect(UserId.isValid(userId.getValue())).toBe(true);
      expect(userId.getTypeName()).toBe('UserId');
    });

    it('should construct from valid string with fromString()', () => {
      const userId = UserId.fromString(VALID_UUID);
      expect(userId.getValue()).toBe(VALID_UUID);
      expect(userId.toString()).toBe(VALID_UUID);
      expect(userId.toJSON()).toBe(VALID_UUID);
    });

    it('should throw error on invalid UUID format', () => {
      expect(() => UserId.fromString('not-a-uuid')).toThrow();
    });

    it('should compare correctly with equals()', () => {
      const id1 = UserId.fromString(VALID_UUID);
      const id2 = UserId.fromString(VALID_UUID);
      const id3 = UserId.fromString(ANOTHER_UUID);

      expect(id1.equals(id2)).toBe(true);
      expect(id1.equals(id3)).toBe(false);
      expect(id1.equals(null)).toBe(false);
    });
  });

  describe('WorkspaceId Value Object', () => {
    it('should generate valid UUID with create()', () => {
      const wsId = WorkspaceId.create();
      expect(WorkspaceId.isValid(wsId.getValue())).toBe(true);
      expect(wsId.getTypeName()).toBe('WorkspaceId');
    });

    it('should construct from valid string with fromString()', () => {
      const wsId = WorkspaceId.fromString(VALID_UUID);
      expect(wsId.getValue()).toBe(VALID_UUID);
    });

    it('should throw error on invalid UUID format', () => {
      expect(() => WorkspaceId.fromString('not-a-uuid')).toThrow();
    });
  });

  describe('MembershipId Value Object', () => {
    it('should generate valid UUID with create()', () => {
      const memId = MembershipId.create();
      expect(MembershipId.isValid(memId.getValue())).toBe(true);
      expect(memId.getTypeName()).toBe('MembershipId');
    });

    it('should construct from valid string with fromString()', () => {
      const memId = MembershipId.fromString(VALID_UUID);
      expect(memId.getValue()).toBe(VALID_UUID);
    });

    it('should throw error on invalid UUID format', () => {
      expect(() => MembershipId.fromString('not-a-uuid')).toThrow();
    });
  });

  describe('InvitationId Value Object', () => {
    it('should generate valid UUID with create()', () => {
      const invId = InvitationId.create();
      expect(InvitationId.isValid(invId.getValue())).toBe(true);
      expect(invId.getTypeName()).toBe('InvitationId');
    });

    it('should construct from valid string with fromString()', () => {
      const invId = InvitationId.fromString(VALID_UUID);
      expect(invId.getValue()).toBe(VALID_UUID);
    });

    it('should throw error on invalid UUID format', () => {
      expect(() => InvitationId.fromString('not-a-uuid')).toThrow();
    });
  });
});
