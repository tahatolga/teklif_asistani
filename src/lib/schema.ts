import { z, ZodTypeAny } from "zod";
import type { Parameter } from "../types";

export function buildZodSchema(params: Parameter[]): z.ZodObject<Record<string, ZodTypeAny>> {
  const shape: Record<string, ZodTypeAny> = {};
  for (const p of params) {
    let field: ZodTypeAny;
    switch (p.type) {
      case "text":
      case "textarea": {
        let s = z.string();
        if (p.max_length) s = s.max(p.max_length, `En fazla ${p.max_length} karakter`);
        field = p.required ? s.min(1, `${p.label} zorunludur`) : s.optional().or(z.literal(""));
        break;
      }
      case "number": {
        let n = z.coerce.number({ error: `${p.label} sayı olmalı` });
        if (p.min !== null) n = n.min(p.min, `En az ${p.min}`);
        if (p.max !== null) n = n.max(p.max, `En fazla ${p.max}`);
        field = p.required ? n : n.optional();
        break;
      }
      case "select": {
        if (p.options.length > 0) {
          field = z.enum(p.options as [string, ...string[]]);
        } else {
          field = z.string();
        }
        if (!p.required) field = (field as z.ZodString).optional();
        break;
      }
      case "multiselect": {
        let arr = z.array(z.string());
        if (p.required) arr = arr.min(1, `${p.label} zorunludur`);
        field = arr;
        break;
      }
      case "boolean":
        field = z.boolean();
        break;
      case "date":
        field = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD formatı");
        if (!p.required) field = (field as z.ZodString).optional();
        break;
    }
    shape[p.key] = field;
  }
  return z.object(shape);
}
