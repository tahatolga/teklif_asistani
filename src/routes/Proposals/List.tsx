import {
  ActionIcon, Button, Group, Select, Stack, Table, Text, TextInput, Title,
} from "@mantine/core";
import {
  IconEdit, IconEye, IconPlus, IconSearch, IconTrash,
} from "@tabler/icons-react";
import { modals } from "@mantine/modals";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { showError, showSuccess } from "../../lib/errors";
import { tr } from "../../lib/i18n/tr";
import type {
  CustomerSummary, ProposalFilter, ProposalSummary,
} from "../../types";

export function ProposalsList() {
  const [rows, setRows] = useState<ProposalSummary[]>([]);
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [filter, setFilter] = useState<ProposalFilter>({});
  const [search, setSearch] = useState("");
  const nav = useNavigate();

  const load = () => {
    const f: ProposalFilter = {
      ...filter,
      search: search.trim() || null,
    };
    api.listProposals(f).then(setRows).catch(showError);
  };

  useEffect(() => { api.listCustomers().then(setCustomers).catch(showError); }, []);
  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [filter, search]);

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
      </Group>
      <Table highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Son Güncelleme</Table.Th>
            <Table.Th>{tr.customer.singular}</Table.Th>
            <Table.Th>{tr.proposal.title}</Table.Th>
            <Table.Th>Etkileşim</Table.Th>
            <Table.Th></Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.length === 0 && (
            <Table.Tr>
              <Table.Td colSpan={5}>
                <Text c="dimmed" ta="center">{tr.common.empty}</Text>
              </Table.Td>
            </Table.Tr>
          )}
          {rows.map((r) => (
            <Table.Tr key={r.id}>
              <Table.Td>
                {new Date(r.updated_at).toLocaleDateString("tr-TR")}
              </Table.Td>
              <Table.Td>
                <Link to={`/customers/${r.customer_id}`}>{r.customer_name}</Link>
              </Table.Td>
              <Table.Td>
                <Link to={`/proposals/${r.id}/view`}>{r.title}</Link>
              </Table.Td>
              <Table.Td>{r.interaction_count}</Table.Td>
              <Table.Td>
                <Group gap="xs">
                  <ActionIcon variant="subtle"
                    title="Görüntüle"
                    onClick={() => nav(`/proposals/${r.id}/view`)}>
                    <IconEye size={16} />
                  </ActionIcon>
                  <ActionIcon variant="subtle"
                    title={tr.common.edit}
                    onClick={() => nav(`/proposals/${r.id}`)}>
                    <IconEdit size={16} />
                  </ActionIcon>
                  <ActionIcon variant="subtle" color="red"
                    title={tr.common.delete}
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
