import { describe, it, expect } from "vitest";
import { buildZodSchema } from "./schema";
import type { Parameter } from "../types";

const baseParam = (overrides: Partial<Parameter>): Parameter => ({
  key: "k", label: "L", description: "", type: "text",
  options: [], unit: null, min: null, max: null,
  max_length: null, required: false, order: 1,
  ...overrides,
});

describe("buildZodSchema", () => {
  it("requires a field when required is true", () => {
    const schema = buildZodSchema([
      baseParam({ key: "malzeme", type: "text", required: true }),
    ]);
    const bad = schema.safeParse({ malzeme: "" });
    expect(bad.success).toBe(false);
  });

  it("accepts number within range", () => {
    const schema = buildZodSchema([
      baseParam({ key: "adet", type: "number", min: 1, max: 100, required: true }),
    ]);
    expect(schema.safeParse({ adet: 10 }).success).toBe(true);
    expect(schema.safeParse({ adet: 200 }).success).toBe(false);
  });

  it("validates select options", () => {
    const schema = buildZodSchema([
      baseParam({
        key: "m", type: "select", options: ["A", "B"], required: true,
      }),
    ]);
    expect(schema.safeParse({ m: "A" }).success).toBe(true);
    expect(schema.safeParse({ m: "C" }).success).toBe(false);
  });
});
