import { describe, it, expect } from "vitest";
import { OutboxEvent } from "../domain/entities/outbox-event.entity";
import { OutboxEventStatus } from "../domain/enums/outbox-event-status.enum";
import { OutboxEventId } from "../domain/value-objects/outbox-event-id";
import { AggregateId } from "../domain/value-objects/aggregate-id";

describe("OutboxEvent Entity", () => {
  const validUuid = "123e4567-e89b-12d3-a456-426614174000";

  describe("create", () => {
    it("should create a new outbox event with PENDING status", () => {
      const event = OutboxEvent.create({
        aggregateType: "Expense",
        aggregateId: validUuid,
        eventType: "ExpenseCreated",
        payload: { amount: 100 },
      });

      expect(event.status).toBe(OutboxEventStatus.PENDING);
      expect(event.aggregateType).toBe("Expense");
      expect(event.aggregateId.getValue()).toBe(validUuid);
      expect(event.eventType).toBe("ExpenseCreated");
      expect(event.payload).toEqual({ amount: 100 });
      expect(event.retryCount).toBe(0);
      expect(event.processedAt).toBeUndefined();
      expect(event.error).toBeUndefined();
    });

    it("should generate unique IDs for each event", () => {
      const event1 = OutboxEvent.create({
        aggregateType: "Expense",
        aggregateId: validUuid,
        eventType: "ExpenseCreated",
        payload: {},
      });

      const event2 = OutboxEvent.create({
        aggregateType: "Expense",
        aggregateId: validUuid,
        eventType: "ExpenseCreated",
        payload: {},
      });

      expect(event1.id.getValue()).not.toBe(event2.id.getValue());
    });
  });

  describe("markAsProcessing", () => {
    it("should change status from PENDING to PROCESSING", () => {
      const event = OutboxEvent.create({
        aggregateType: "Expense",
        aggregateId: validUuid,
        eventType: "ExpenseCreated",
        payload: {},
      });

      event.markAsProcessing();
      expect(event.status).toBe(OutboxEventStatus.PROCESSING);
    });

    it("should throw error if event is already PROCESSED", () => {
      const event = OutboxEvent.create({
        aggregateType: "Expense",
        aggregateId: validUuid,
        eventType: "ExpenseCreated",
        payload: {},
      });

      event.markAsProcessing();
      event.markAsProcessed();

      expect(() => event.markAsProcessing()).toThrow(
        "Cannot mark processed event as processing",
      );
    });
  });

  describe("markAsProcessed", () => {
    it("should change status to PROCESSED and set processedAt", () => {
      const event = OutboxEvent.create({
        aggregateType: "Expense",
        aggregateId: validUuid,
        eventType: "ExpenseCreated",
        payload: {},
      });

      event.markAsProcessing();
      event.markAsProcessed();

      expect(event.status).toBe(OutboxEventStatus.PROCESSED);
      expect(event.processedAt).toBeInstanceOf(Date);
      expect(event.error).toBeUndefined();
    });
  });

  describe("markAsFailed", () => {
    it("should change status to FAILED and increment retry count", () => {
      const event = OutboxEvent.create({
        aggregateType: "Expense",
        aggregateId: validUuid,
        eventType: "ExpenseCreated",
        payload: {},
      });

      event.markAsProcessing();
      event.markAsFailed("Connection timeout");

      expect(event.status).toBe(OutboxEventStatus.FAILED);
      expect(event.retryCount).toBe(1);
      expect(event.error).toBe("Connection timeout");
    });

    it("should increment retry count on multiple failures", () => {
      const event = OutboxEvent.create({
        aggregateType: "Expense",
        aggregateId: validUuid,
        eventType: "ExpenseCreated",
        payload: {},
      });

      event.markAsFailed("Error 1");
      event.markAsFailed("Error 2");
      event.markAsFailed("Error 3");

      expect(event.retryCount).toBe(3);
    });
  });

  describe("resetToPending", () => {
    it("should reset FAILED event to PENDING", () => {
      const event = OutboxEvent.create({
        aggregateType: "Expense",
        aggregateId: validUuid,
        eventType: "ExpenseCreated",
        payload: {},
      });

      event.markAsFailed("Error");
      event.resetToPending();

      expect(event.status).toBe(OutboxEventStatus.PENDING);
    });

    it("should throw error if trying to reset PROCESSED event", () => {
      const event = OutboxEvent.create({
        aggregateType: "Expense",
        aggregateId: validUuid,
        eventType: "ExpenseCreated",
        payload: {},
      });

      event.markAsProcessing();
      event.markAsProcessed();

      expect(() => event.resetToPending()).toThrow(
        "Cannot reset processed event to pending",
      );
    });
  });

  describe("canRetry", () => {
    it("should return true if retry count is below max retries", () => {
      const event = OutboxEvent.create({
        aggregateType: "Expense",
        aggregateId: validUuid,
        eventType: "ExpenseCreated",
        payload: {},
      });

      event.markAsFailed("Error");
      expect(event.canRetry(3)).toBe(true);
    });

    it("should return false if retry count exceeds max retries", () => {
      const event = OutboxEvent.create({
        aggregateType: "Expense",
        aggregateId: validUuid,
        eventType: "ExpenseCreated",
        payload: {},
      });

      event.markAsFailed("Error 1");
      event.markAsFailed("Error 2");
      event.markAsFailed("Error 3");

      expect(event.canRetry(3)).toBe(false);
    });

    it("should return false if status is not FAILED", () => {
      const event = OutboxEvent.create({
        aggregateType: "Expense",
        aggregateId: validUuid,
        eventType: "ExpenseCreated",
        payload: {},
      });

      expect(event.canRetry(3)).toBe(false);
    });
  });

  describe("toJSON", () => {
    it("should serialize event to JSON", () => {
      const event = OutboxEvent.create({
        aggregateType: "Expense",
        aggregateId: validUuid,
        eventType: "ExpenseCreated",
        payload: { amount: 100 },
      });

      const json = event.toJSON();

      expect(json).toMatchObject({
        aggregateType: "Expense",
        aggregateId: validUuid,
        eventType: "ExpenseCreated",
        payload: { amount: 100 },
        status: OutboxEventStatus.PENDING,
        retryCount: 0,
      });
      expect(json.id).toBeDefined();
      expect(json.createdAt).toBeInstanceOf(Date);
    });
  });

  describe("reconstitute", () => {
    it("should reconstitute event from persisted data", () => {
      const id = OutboxEventId.create();
      const createdAt = new Date();

      const event = OutboxEvent.reconstitute({
        id,
        aggregateType: "Expense",
        aggregateId: AggregateId.fromString(validUuid),
        eventType: "ExpenseCreated",
        payload: { amount: 100 },
        status: OutboxEventStatus.PROCESSED,
        createdAt,
        processedAt: new Date(),
        retryCount: 2,
        error: "Previous error",
      });

      expect(event.id).toBe(id);
      expect(event.status).toBe(OutboxEventStatus.PROCESSED);
      expect(event.retryCount).toBe(2);
      expect(event.error).toBe("Previous error");
      expect(event.aggregateId.getValue()).toBe(validUuid);
    });
  });
});
