import { describe, it, expect } from "vitest";
import { OutboxEventId } from "../domain/value-objects/outbox-event-id";

describe("OutboxEventId", () => {
  describe("create", () => {
    it("should create a new UUID", () => {
      const id = OutboxEventId.create();
      expect(id.getValue()).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it("should create unique IDs", () => {
      const id1 = OutboxEventId.create();
      const id2 = OutboxEventId.create();
      expect(id1.getValue()).not.toBe(id2.getValue());
    });
  });

  describe("fromString", () => {
    it("should create from valid UUID string", () => {
      const uuid = "123e4567-e89b-12d3-a456-426614174000";
      const id = OutboxEventId.fromString(uuid);
      expect(id.getValue()).toBe(uuid);
    });

    it("should throw error for empty string", () => {
      expect(() => OutboxEventId.fromString("")).toThrow(
        "OutboxEventId cannot be empty",
      );
    });

    it("should throw error for whitespace string", () => {
      expect(() => OutboxEventId.fromString("   ")).toThrow(
        "OutboxEventId cannot be empty",
      );
    });
  });

  describe("equals", () => {
    it("should return true for same IDs", () => {
      const uuid = "123e4567-e89b-12d3-a456-426614174000";
      const id1 = OutboxEventId.fromString(uuid);
      const id2 = OutboxEventId.fromString(uuid);
      expect(id1.equals(id2)).toBe(true);
    });

    it("should return false for different IDs", () => {
      const id1 = OutboxEventId.create();
      const id2 = OutboxEventId.create();
      expect(id1.equals(id2)).toBe(false);
    });
  });

  describe("toString", () => {
    it("should return UUID string", () => {
      const uuid = "123e4567-e89b-12d3-a456-426614174000";
      const id = OutboxEventId.fromString(uuid);
      expect(id.toString()).toBe(uuid);
    });
  });
});
