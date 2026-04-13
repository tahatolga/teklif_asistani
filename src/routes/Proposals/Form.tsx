import {
  Button, Divider, Group, Paper, Select, Stack, Textarea,
  TextInput, Title, NumberInput, Text,
} from "@mantine/core";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api } from "../../lib/api";
import { buildZodSchema } from "../../lib/schema";
import { DynamicField } from "../../components/DynamicField";
import { showError, showSuccess } from "../../lib/errors";
import { tr } from "../../lib/i18n/tr";
import { useParameters } from "../../stores/parameters";
import { useSettings } from "../../stores/settings";
import type {
  CustomerSummary, ProposalInput, ProposalStatus,
} from "../../types";

const statuses: ProposalStatus[] = [
  "taslak", "gonderildi", "kazanildi", "kaybedildi", "beklemede",
];

export function ProposalForm() {
  const { id } = useParams<{ id?: string }>();
  const [search] = useSearchParams();
  const nav = useNavigate();
  const catalog = useParameters((s) => s.catalog);
  const settings = useSettings((s) => s.settings);

  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [prefilledKeys, setPrefilledKeys] = useState<Set<string>>(new Set());

  const coreSchema = z.object({
    customer_id: z.string().min(1, "Müşteri seçilmeli"),
    title: z.string().min(1, "Başlık zorunlu"),
    status: z.enum(["taslak", "gonderildi", "kazanildi", "kaybedildi", "beklemede"]),
    total_amount: z.coerce.number().min(0),
    currency: z.string().min(1),
    notes: z.string().optional(),
  });

  const dynamicSchema = useMemo(
    () => buildZodSchema(catalog?.parameters ?? []),
    [catalog]);

  const fullSchema = useMemo(
    () => coreSchema.merge(dynamicSchema as unknown as typeof coreSchema),
    [dynamicSchema]);

  type FormValues = z.infer<typeof coreSchema> & Record<string, unknown>;

  const { handleSubmit, control, reset, watch, setValue } = useForm<FormValues>({
    resolver: zodResolver(fullSchema) as never,
    defaultValues: {
      customer_id: search.get("customer") ?? "",
      title: "",
      status: "taslak",
      total_amount: 0,
      currency: settings?.default_currency ?? "TRY",
      notes: "",
    },
  });

  const watchedCustomer = watch("customer_id");

  useEffect(() => { api.listCustomers().then(setCustomers).catch(showError); }, []);

  useEffect(() => {
    if (id) {
      api.getProposal(id).then((p) => {
        reset({
          customer_id: p.customer_id,
          title: p.title,
          status: p.status,
          total_amount: p.total_amount,
          currency: p.currency,
          notes: p.notes,
          ...p.custom_fields,
        });
        setPrefilledKeys(new Set());
      }).catch(showError);
    }
  }, [id]);

  useEffect(() => {
    if (id || !catalog || !watchedCustomer) return;
    api.getPrefillValues(watchedCustomer).then((values) => {
      const keys = new Set<string>();
      for (const p of catalog.parameters) {
        if (p.key in values) {
          setValue(p.key, values[p.key] as never);
          keys.add(p.key);
        }
      }
      setPrefilledKeys(keys);
    }).catch(() => {});
  }, [watchedCustomer, catalog, id]);

  const onSubmit = handleSubmit(async (values) => {
    const params = catalog?.parameters ?? [];
    const custom_fields: Record<string, unknown> = {};
    for (const p of params) {
      custom_fields[p.key] = values[p.key];
    }
    const input: ProposalInput = {
      customer_id: values.customer_id,
      title: values.title,
      status: values.status,
      total_amount: values.total_amount,
      currency: values.currency,
      notes: values.notes ?? "",
      custom_fields,
    };
    try {
      if (id) await api.updateProposal(id, input);
      else await api.createProposal(input);
      showSuccess("Kaydedildi");
      nav("/proposals");
    } catch (err) { showError(err); }
  });

  return (
    <Stack>
      <Title order={2}>
        {id ? tr.proposal.editTitle : tr.proposal.newTitle}
      </Title>
      <form onSubmit={onSubmit}>
        <Stack>
          <Paper p="md" withBorder>
            <Stack>
              <Controller name="customer_id" control={control}
                render={({ field, fieldState }) => (
                  <Select label={tr.customer.singular} required
                    data={customers.map((c) => ({ value: c.id, label: c.name }))}
                    value={field.value} onChange={(v) => field.onChange(v ?? "")}
                    error={fieldState.error?.message} searchable
                  />
                )} />
              <Controller name="title" control={control}
                render={({ field, fieldState }) => (
                  <TextInput label={tr.proposal.title} required
                    value={field.value}
                    onChange={(e) => field.onChange(e.currentTarget.value)}
                    error={fieldState.error?.message} />
                )} />
              <Group grow>
                <Controller name="status" control={control}
                  render={({ field }) => (
                    <Select label={tr.proposal.status}
                      data={statuses.map((s) => ({
                        value: s, label: tr.proposal.statuses[s],
                      }))}
                      value={field.value}
                      onChange={(v) => v && field.onChange(v)} />
                  )} />
                <Controller name="total_amount" control={control}
                  render={({ field, fieldState }) => (
                    <NumberInput label={tr.proposal.total}
                      value={field.value}
                      onChange={(v) =>
                        field.onChange(typeof v === "number" ? v : 0)}
                      error={fieldState.error?.message}
                      thousandSeparator="."
                      decimalSeparator=","
                    />
                  )} />
                <Controller name="currency" control={control}
                  render={({ field }) => (
                    <Select label={tr.proposal.currency}
                      data={["TRY", "EUR", "USD"]}
                      value={field.value}
                      onChange={(v) => v && field.onChange(v)} />
                  )} />
              </Group>
              <Controller name="notes" control={control}
                render={({ field }) => (
                  <Textarea label={tr.proposal.notes} autosize minRows={2}
                    value={(field.value as string) ?? ""}
                    onChange={(e) => field.onChange(e.currentTarget.value)} />
                )} />
            </Stack>
          </Paper>
          {catalog && catalog.parameters.length > 0 && (
            <Paper p="md" withBorder>
              <Stack>
                <Group justify="space-between">
                  <Title order={4}>{tr.parameter.plural}</Title>
                  {prefilledKeys.size > 0 && !id && (
                    <Text size="xs" c="dimmed">
                      Bazı alanlar son teklifinden dolduruldu
                    </Text>
                  )}
                </Group>
                <Divider />
                {catalog.parameters.map((p) => (
                  <DynamicField key={p.key} param={p}
                    control={control as never}
                    fromLastBadge={prefilledKeys.has(p.key)} />
                ))}
              </Stack>
            </Paper>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={() => nav("/proposals")}>
              {tr.common.cancel}
            </Button>
            <Button type="submit">{tr.common.save}</Button>
          </Group>
        </Stack>
      </form>
    </Stack>
  );
}
