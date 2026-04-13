import {
  Modal, Stack, TextInput, Textarea, Select, Checkbox,
  NumberInput, TagsInput, Button, Group,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useEffect } from "react";
import type { Parameter, ParameterType } from "../types";
import { tr } from "../lib/i18n/tr";

interface Props {
  opened: boolean;
  onClose: () => void;
  onSave: (param: Parameter) => Promise<void>;
  initial?: Parameter;
  nextOrder: number;
}

const typeOptions: { value: ParameterType; label: string }[] = [
  { value: "text", label: tr.parameter.types.text },
  { value: "textarea", label: tr.parameter.types.textarea },
  { value: "number", label: tr.parameter.types.number },
  { value: "select", label: tr.parameter.types.select },
  { value: "multiselect", label: tr.parameter.types.multiselect },
  { value: "boolean", label: tr.parameter.types.boolean },
  { value: "date", label: tr.parameter.types.date },
];

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ı/g, "i")
    .replace(/ö/g, "o").replace(/ş/g, "s").replace(/ü/g, "u")
    .replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

export function ParameterFormModal({
  opened, onClose, onSave, initial, nextOrder,
}: Props) {
  const form = useForm<Parameter>({
    initialValues: initial ?? {
      key: "", label: "", description: "", type: "text",
      options: [], unit: null, min: null, max: null,
      max_length: null, required: false, order: nextOrder,
    },
  });

  useEffect(() => {
    if (!initial && form.values.key === "" && form.values.label) {
      form.setFieldValue("key", slugify(form.values.label));
    }
  }, [form.values.label]);

  const submit = form.onSubmit(async (values) => {
    await onSave(values);
    onClose();
  });

  const needsOptions =
    form.values.type === "select" || form.values.type === "multiselect";
  const isNumber = form.values.type === "number";
  const isText = form.values.type === "text" || form.values.type === "textarea";

  return (
    <Modal opened={opened} onClose={onClose}
      title={initial ? tr.parameter.singular : "Yeni Parametre"} size="lg">
      <form onSubmit={submit}>
        <Stack>
          <TextInput label={tr.parameter.label} required
            {...form.getInputProps("label")} />
          <TextInput label={tr.parameter.key} required
            {...form.getInputProps("key")}
            disabled={Boolean(initial)} />
          <Textarea label={tr.parameter.description}
            {...form.getInputProps("description")} autosize minRows={2} />
          <Select label={tr.parameter.type} data={typeOptions}
            value={form.values.type}
            onChange={(v) => v && form.setFieldValue("type", v as ParameterType)} />
          <TextInput label={tr.parameter.unit}
            value={form.values.unit ?? ""}
            onChange={(e) =>
              form.setFieldValue("unit",
                e.currentTarget.value || null)} />
          {needsOptions && (
            <TagsInput label={tr.parameter.options}
              value={form.values.options}
              onChange={(v) => form.setFieldValue("options", v)} />
          )}
          {isNumber && (
            <Group grow>
              <NumberInput label="Min"
                value={form.values.min ?? ""}
                onChange={(v) => form.setFieldValue("min",
                  typeof v === "number" ? v : null)} />
              <NumberInput label="Max"
                value={form.values.max ?? ""}
                onChange={(v) => form.setFieldValue("max",
                  typeof v === "number" ? v : null)} />
            </Group>
          )}
          {isText && (
            <NumberInput label="Max karakter"
              value={form.values.max_length ?? ""}
              onChange={(v) => form.setFieldValue("max_length",
                typeof v === "number" ? v : null)} />
          )}
          <Checkbox label={tr.parameter.required}
            checked={form.values.required}
            onChange={(e) =>
              form.setFieldValue("required", e.currentTarget.checked)} />
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>{tr.common.cancel}</Button>
            <Button type="submit">{tr.common.save}</Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
