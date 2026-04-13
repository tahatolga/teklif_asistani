import {
  ActionIcon, Badge, Button, Chip, Group, Select, Stack, Table,
  Text, TextInput, Title,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { IconEdit, IconPlus, IconSearch, IconTrash } from "@tabler/icons-react";
import { modals } from "@mantine/modals";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { showError, showSuccess } from "../../lib/errors";
import { tr } from "../../lib/i18n/tr";
import type {
  CustomerSummary, ProposalFilter, ProposalStatus, ProposalSummary,
} from "../../types";

const statuses: ProposalStatus[] = [
  "taslak", "gonderildi", "kazanildi", "kaybedildi", "beklemede",
];

export function ProposalsList() {
  const [rows, setRows] = useState<ProposalSummary[]>([]);
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [filter, setFilter] = useState<ProposalFilter>({});
  const [search, setSearch] = useState("");
  const [dates, setDates] = useState<[Date | null, Date | null]>([null, null]);
  const nav = useNavigate();

  const load = () => {
    const f: ProposalFilter = {
      ...filter,
      search: search.trim() || null,
      date_from: dates[0] ? dates[0].toISOString() : null,
      date_to: dates[1] ? dates[1].toISOString() : null,
    };
    api.listProposals(f).then(setRows).catch(showError);
  };

  useEffect(() => { api.listCustomers().then(setCustomers).catch(showError); }, []);
  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [filter, search, dates]);

  const del = (id: string, title: string) => {
    modals.openConfirmModal({
      title: `${title} silinsin mi?`,
      labels: { confirm: tr.common.delete, cancel: tr.common.cancel },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try { await api.deleteProposal(id); showSuccess("Silindi"); load(); }
        catch (err) { showError(err); }
      },
    });
  };

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>{tr.proposal.plural}</Title>
        <Button leftSection={<IconPlus size={16} />}
          onClick={() => nav("/proposals/new")}>
          {tr.common.new}
        </Button>
      </Group>
      <Group>
        <TextInput
          placeholder={tr.common.search}
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          style={{ flex: 1 }}
        />
        <Select
          placeholder={tr.customer.singular}
          data={customers.map((c) => ({ value: c.id, label: c.name }))}
          value={filter.customer_id ?? null}
          onChange={(v) => setFilter({ ...filter, customer_id: v })}
          clearable
        />
        <DatePickerInput type="range"
          placeholder="Tarih aralığı"
          value={dates}
          onChange={(v) => setDates(v as [Date | null, Date | null])}
          clearable
        />
      </Group>
      <Chip.Group multiple={false}
        value={filter.status ?? ""}
        onChange={(v) =>
          setFilter({ ...filter, status: (v as ProposalStatus) || null })}>
        <Group gap="xs">
          <Chip value="">Tümü</Chip>
          {statuses.map((s) => (
            <Chip key={s} value={s}>{tr.proposal.statuses[s]}</Chip>
          ))}
        </Group>
      </Chip.Group>
      <Table highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{tr.proposal.createdAt}</Table.Th>
            <Table.Th>{tr.customer.singular}</Table.Th>
            <Table.Th>{tr.proposal.title}</Table.Th>
            <Table.Th>{tr.proposal.status}</Table.Th>
            <Table.Th>{tr.proposal.total}</Table.Th>
            <Table.Th></Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.length === 0 && (
            <Table.Tr>
              <Table.Td colSpan={6}>
                <Text c="dimmed" ta="center">{tr.common.empty}</Text>
              </Table.Td>
            </Table.Tr>
          )}
          {rows.map((r) => (
            <Table.Tr key={r.id}>
              <Table.Td>{new Date(r.created_at).toLocaleDateString("tr-TR")}</Table.Td>
              <Table.Td>
                <Link to={`/customers/${r.customer_id}`}>{r.customer_name}</Link>
              </Table.Td>
              <Table.Td>
                <Link to={`/proposals/${r.id}`}>{r.title}</Link>
              </Table.Td>
              <Table.Td>
                <Badge>{tr.proposal.statuses[r.status]}</Badge>
              </Table.Td>
              <Table.Td>
                {r.total_amount.toLocaleString("tr-TR")} {r.currency}
              </Table.Td>
              <Table.Td>
                <Group gap="xs">
                  <ActionIcon variant="subtle"
                    onClick={() => nav(`/proposals/${r.id}`)}>
                    <IconEdit size={16} />
                  </ActionIcon>
                  <ActionIcon variant="subtle" color="red"
                    onClick={() => del(r.id, r.title)}>
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Stack>
  );
}
