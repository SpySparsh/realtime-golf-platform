import { badRequest } from "@/utils/app-error";

export function assertNumberRange(
  value: unknown,
  min: number,
  max: number,
  fieldName: string
): asserts value is number {
  if (typeof value !== "number" || Number.isNaN(value) || value < min || value > max) {
    throw badRequest(`${fieldName} must be between ${min} and ${max}`);
  }
}

export function assertString(value: unknown, fieldName: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw badRequest(`${fieldName} is required`);
  }
}

