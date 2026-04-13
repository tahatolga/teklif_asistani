import { Autocomplete, NumberInput } from "@mantine/core";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { FieldHistoryEntry } from "../types";

interface Props {
  fieldKey: string;
  label: string;
  required?: boolean;
  description?: string;
  value: string | number | undefined;
  onChange: (value: string | number) => void;
  mode: "text" | "number";
}

export function FieldHistoryCombobox({
  fieldKey, label, required, description, value, onChange, mode,
}: Props) {
  const [history, setHistory] = useState<FieldHistoryEntry[]>([]);

  useEffect(() => {
    api.getFieldHistory(fieldKey, 20).then(setHistory).catch(() => {});
  }, [fieldKey]);

  const options = history.map((h) => String(h.value).replace(/^"|"$/g, ""));

  if (mode === "number") {
    return (
      <NumberInput
        label={label}
        description={description}
        withAsterisk={required}
        value={typeof value === "number" ? value : undefined}
        onChange={(v) => onChange(typeof v === "number" ? v : 0)}
      />
    );
  }

  return (
    <Autocomplete
      label={label}
      description={description}
      withAsterisk={required}
      data={options}
      value={typeof value === "string" ? value : ""}
      onChange={onChange}
    />
  );
}
