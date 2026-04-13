import { notifications } from "@mantine/notifications";
import type { AppError } from "../types";
import { tr } from "./i18n/tr";

export function errorToMessage(err: unknown): string {
  if (typeof err === "object" && err !== null && "kind" in err) {
    const e = err as AppError;
    switch (e.kind) {
      case "not_found": return tr.errors.notFound(e.entity);
      case "validation": return `${e.field}: ${e.message}`;
      case "conflict": return e.message;
      case "io": return `${tr.errors.io}: ${e.message}`;
      case "corrupt": return `${tr.errors.corrupt}: ${e.reason}`;
    }
  }
  if (err instanceof Error) return err.message;
  return tr.errors.unknown;
}

export function showError(err: unknown) {
  notifications.show({
    color: "red",
    title: "Hata",
    message: errorToMessage(err),
  });
}

export function showSuccess(message: string) {
  notifications.show({ color: "green", title: "Başarılı", message });
}
