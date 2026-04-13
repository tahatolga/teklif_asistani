import {
  Textarea, NumberInput, Select, MultiSelect,
  Checkbox, Tooltip,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { IconInfoCircle } from "@tabler/icons-react";
import { Controller, type Control } from "react-hook-form";
import type { Parameter } from "../types";
import { FieldHistoryCombobox } from "./FieldHistoryCombobox";

interface Props {
  param: Parameter;
  control: Control<Record<string, unknown>>;
  fromLastBadge?: boolean;
}

export function DynamicField({ param, control, fromLastBadge }: Props) {
  const label = (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      {param.label}
      {param.unit && <span style={{ color: "#888" }}>({param.unit})</span>}
      {param.description && (
        <Tooltip label={param.description} multiline w={240}>
          <IconInfoCircle size={14} />
        </Tooltip>
      )}
      {fromLastBadge && (
        <span style={{
          fontSize: 10, color: "#2b8a3e", background: "#e6fcf5",
          padding: "1px 6px", borderRadius: 4,
        }}>
          Son teklifinden
        </span>
      )}
    </span>
  );

  return (
    <Controller
      name={param.key}
      control={control}
      render={({ field, fieldState }) => {
        const error = fieldState.error?.message;
        switch (param.type) {
          case "text":
            return (
              <FieldHistoryCombobox
                fieldKey={param.key}
                label={param.label}
                required={param.required}
                description={param.description}
                value={field.value as string | undefined}
                onChange={field.onChange}
                mode="text"
              />
            );
          case "textarea":
            return (
              <Textarea
                label={label}
                withAsterisk={param.required}
                value={(field.value as string) ?? ""}
                onChange={(e) => field.onChange(e.currentTarget.value)}
                error={error}
                autosize minRows={2}
              />
            );
          case "number":
            return (
              <NumberInput
                label={label}
                withAsterisk={param.required}
                min={param.min ?? undefined}
                max={param.max ?? undefined}
                value={(field.value as number) ?? ""}
                onChange={(v) => field.onChange(typeof v === "number" ? v : undefined)}
                error={error}
              />
            );
          case "select":
            return (
              <Select
                label={label}
                withAsterisk={param.required}
                data={param.options}
                value={(field.value as string) ?? null}
                onChange={(v) => field.onChange(v)}
                error={error}
                searchable
              />
            );
          case "multiselect":
            return (
              <MultiSelect
                label={label}
                withAsterisk={param.required}
                data={param.options}
                value={(field.value as string[]) ?? []}
                onChange={(v) => field.onChange(v)}
                error={error}
                searchable
              />
            );
          case "boolean":
            return (
              <Checkbox
                label={label}
                checked={(field.value as boolean) ?? false}
                onChange={(e) => field.onChange(e.currentTarget.checked)}
              />
            );
          case "date":
            return (
              <DateInput
                label={label}
                withAsterisk={param.required}
                value={field.value ? new Date(field.value as string) : null}
                onChange={(d) => field.onChange(
                  d ? new Date(d as unknown as string | number | Date)
                    .toISOString().slice(0, 10) : null)}
                valueFormat="YYYY-MM-DD"
                error={error}
              />
            );
        }
      }}
    />
  );
}
