import { Button, Group, Stack, Table, TextInput, Title, ActionIcon, Text } from "@mantine/core";
import { IconPlus, IconSearch, IconEdit, IconTrash } from "@tabler/icons-react";
import { modals } from "@mantine/modals";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { showError, showSuccess } from "../../lib/errors";
import { tr } from "../../lib/i18n/tr";
import type { CustomerSummary } from "../../types";

export function CustomersList() {
  const [rows, setRows] = useState<CustomerSummary[]>([]);
  const [q, setQ] = useState("");
  const nav = useNavigate();

  const load = () => api.listCustomers().then(setRows).catch(showError);
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const needle = q.toLowerCase().trim();
    if (!needle) return rows;
    return rows.filter((r) =>
      r.name.toLowerCase().includes(needle) ||
      r.contact_person.toLowerCase().includes(needle));
  }, [rows, q]);

  const del = (id: string, name: string) => {
    modals.openConfirmModal({
      title: `${name} silinsin mi?`,
      labels: { confirm: tr.common.delete, cancel: tr.common.cancel },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          await api.deleteCustomer(id);
          showSuccess("Silindi");
          load();
        } catch (err) { showError(err); }
      },
    });
  };

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>{tr.customer.plural}</Title>
        <Button leftSection={<IconPlus size={16} />}
          onClick={() => nav("/customers/new")}>
          {tr.common.new}
        </Button>
      </Group>
      <TextInput
        placeholder={tr.common.search}
        leftSection={<IconSearch size={16} />}
        value={q}
        onChange={(e) => setQ(e.currentTarget.value)}
      />
      <Table highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{tr.customer.name}</Table.Th>
            <Table.Th>{tr.customer.contact}</Table.Th>
            <Table.Th>{tr.customer.phone}</Table.Th>
            <Table.Th>{tr.customer.proposalCount}</Table.Th>
            <Table.Th></Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {filtered.length === 0 && (
            <Table.Tr>
              <Table.Td colSpan={5}>
                <Text c="dimmed" ta="center">{tr.common.empty}</Text>
              </Table.Td>
            </Table.Tr>
          )}
          {filtered.map((r) => (
            <Table.Tr key={r.id}>
              <Table.Td>
                <Link to={`/customers/${r.id}`}>{r.name}</Link>
              </Table.Td>
              <Table.Td>{r.contact_person}</Table.Td>
              <Table.Td>{r.phone}</Table.Td>
              <Table.Td>{r.proposal_count}</Table.Td>
              <Table.Td>
                <Group gap="xs">
                  <ActionIcon variant="subtle"
                    onClick={() => nav(`/customers/${r.id}/edit`)}>
                    <IconEdit size={16} />
                  </ActionIcon>
                  <ActionIcon variant="subtle" color="red"
                    onClick={() => del(r.id, r.name)}>
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
