import {
  Button, Group, Paper, Select, Stack, Textarea, TextInput, Title,
} from "@mantine/core";
import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api } from "../../lib/api";
import { showError, showSuccess } from "../../lib/errors";
import { tr } from "../../lib/i18n/tr";
import { UnsavedGuard } from "../../components/UnsavedGuard";
import type { CustomerSummary, Proposal, ProposalInput } from "../../types";

interface FormState {
  customer_id: string;
  title: string;
  notes: string;
}

const empty: FormState = { customer_id: "", title: "", notes: "" };

export function ProposalForm() {
  const { id } = useParams<{ id?: string }>();
  const [search] = useSearchParams();
  const nav = useNavigate();
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [form, setForm] = useState<FormState>(() => ({
    ...empty,
    customer_id: search.get("customer") ?? "",
  }));
  const [baseline, setBaseline] = useState<FormState>(empty);
  const [loading, setLoading] = useState(false);
  const [proposal, setProposal] = useState<Proposal | null>(null);

  useEffect(() => { api.listCustomers().then(setCustomers).catch(showError); }, []);

  useEffect(() => {
    if (!id) {
      const init = { ...empty, customer_id: search.get("customer") ?? "" };
      setForm(init);
      setBaseline(init);
      return;
    }
    api.getProposal(id).then((p) => {
      setProposal(p);
      const next: FormState = {
        customer_id: p.customer_id, title: p.title, notes: p.notes,
      };
      setForm(next);
      setBaseline(next);
    }).catch(showError);
  }, [id]);

  const isDirty =
    form.customer_id !== baseline.customer_id ||
    form.title !== baseline.title ||
    form.notes !== baseline.notes;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customer_id) {
      showError({ kind: "validation", field: "customer_id", message: "Müşteri seçilmeli" });
      return;
    }
    if (!form.title.trim()) {
      showError({ kind: "validation", field: "title", message: "Başlık zorunlu" });
      return;
    }
    setLoading(true);
    try {
      if (id && proposal) {
        const input: ProposalInput = {
          customer_id: form.customer_id,
          title: form.title,
          notes: form.notes,
          interactions: proposal.interactions,
          cost_lines: proposal.cost_lines,
        };
        const updated = await api.updateProposal(id, input);
        showSuccess("Kaydedildi");
        setBaseline({
          customer_id: updated.customer_id,
          title: updated.title,
          notes: updated.notes,
        });
        setTimeout(() => nav(`/proposals/${updated.id}/view`), 0);
      } else {
        const input: ProposalInput = {
          customer_id: form.customer_id,
          title: form.title,
          notes: form.notes,
          interactions: [],
          cost_lines: [],
        };
        const created = await api.createProposal(input);
        showSuccess("Kaydedildi");
        setBaseline(form);
        setTimeout(() => nav(`/proposals/${created.id}/view`), 0);
      }
    } catch (err) { showError(err); }
    finally { setLoading(false); }
  };

  return (
    <Stack>
      <UnsavedGuard dirty={isDirty} />
      <Title order={2}>
        {id ? tr.proposal.editTitle : tr.proposal.newTitle}
      </Title>
      <form onSubmit={submit}>
        <Paper p="md" withBorder>
          <Stack>
            <Select label={tr.customer.singular} required
              data={customers.map((c) => ({ value: c.id, label: c.name }))}
              value={form.customer_id || null}
              onChange={(v) => setForm({ ...form, customer_id: v ?? "" })}
              searchable
            />
            <TextInput label={tr.proposal.title} required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.currentTarget.value })}
            />
            <Textarea label={tr.proposal.notes} autosize minRows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.currentTarget.value })}
            />
            <Group justify="flex-end">
              <Button variant="default" onClick={() => nav("/proposals")}>
                {tr.common.cancel}
              </Button>
              <Button type="submit" loading={loading}>
                {tr.common.save}
              </Button>
            </Group>
          </Stack>
        </Paper>
      </form>
    </Stack>
  );
}
