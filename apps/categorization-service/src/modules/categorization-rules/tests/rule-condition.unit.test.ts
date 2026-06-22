import { describe, it, expect } from "vitest";
import { RuleCondition } from "../domain/value-objects/rule-condition";
import { RuleConditionType } from "../domain/enums/rule-condition-type";
import { InvalidRuleConditionError } from "../domain/errors/categorization-rules.errors";

describe("RuleCondition", () => {
  describe("Validation", () => {
    it("should throw InvalidRuleConditionError for empty value", () => {
      expect(() => {
        RuleCondition.create(RuleConditionType.MERCHANT_CONTAINS, "");
      }).toThrow(InvalidRuleConditionError);
    });

    it("should throw InvalidRuleConditionError for negative amount", () => {
      expect(() => {
        RuleCondition.create(RuleConditionType.AMOUNT_GREATER_THAN, "-10");
      }).toThrow(InvalidRuleConditionError);
    });

    it("should throw InvalidRuleConditionError for invalid number", () => {
      expect(() => {
        RuleCondition.create(RuleConditionType.AMOUNT_GREATER_THAN, "abc");
      }).toThrow(InvalidRuleConditionError);
    });
  });

  describe("Matching Logic", () => {
    // Merchant Tests
    it("should match merchant contains (case insensitive)", () => {
      const condition = RuleCondition.create(
        RuleConditionType.MERCHANT_CONTAINS,
        "Uber",
      );
      expect(condition.matches({ amount: 10, merchant: "Uber Eats" })).toBe(
        true,
      );
      expect(condition.matches({ amount: 10, merchant: "uber ride" })).toBe(
        true,
      );
      expect(condition.matches({ amount: 10, merchant: "Lyft" })).toBe(false);
    });

    it("should match merchant equals (case insensitive)", () => {
      const condition = RuleCondition.create(
        RuleConditionType.MERCHANT_EQUALS,
        "Amazon",
      );
      expect(condition.matches({ amount: 10, merchant: "Amazon" })).toBe(true);
      expect(condition.matches({ amount: 10, merchant: "amazon" })).toBe(true);
      expect(condition.matches({ amount: 10, merchant: "Amazon Inc" })).toBe(
        false,
      );
    });

    // Description Tests
    it("should match description contains", () => {
      const condition = RuleCondition.create(
        RuleConditionType.DESCRIPTION_CONTAINS,
        "Lunch",
      );
      expect(condition.matches({ amount: 10, description: "Team Lunch" })).toBe(
        true,
      );
      expect(condition.matches({ amount: 10, description: "Dinner" })).toBe(
        false,
      );
    });

    // Amount Tests
    it("should match amount greater than", () => {
      const condition = RuleCondition.create(
        RuleConditionType.AMOUNT_GREATER_THAN,
        "100",
      );
      expect(condition.matches({ amount: 101 })).toBe(true);
      expect(condition.matches({ amount: 100 })).toBe(false);
      expect(condition.matches({ amount: 99 })).toBe(false);
    });

    it("should match amount less than", () => {
      const condition = RuleCondition.create(
        RuleConditionType.AMOUNT_LESS_THAN,
        "50",
      );
      expect(condition.matches({ amount: 49 })).toBe(true);
      expect(condition.matches({ amount: 50 })).toBe(false);
    });

    it("should match amount equals", () => {
      const condition = RuleCondition.create(
        RuleConditionType.AMOUNT_EQUALS,
        "50",
      );
      expect(condition.matches({ amount: 50 })).toBe(true);
      expect(condition.matches({ amount: 50.1 })).toBe(false);
    });

    // Payment Method Tests
    it("should match payment method equals", () => {
      const condition = RuleCondition.create(
        RuleConditionType.PAYMENT_METHOD_EQUALS,
        "Credit Card",
      );
      expect(
        condition.matches({ amount: 10, paymentMethod: "Credit Card" }),
      ).toBe(true);
      expect(
        condition.matches({ amount: 10, paymentMethod: "credit card" }),
      ).toBe(true);
      expect(condition.matches({ amount: 10, paymentMethod: "Cash" })).toBe(
        false,
      );
    });
  });
});
