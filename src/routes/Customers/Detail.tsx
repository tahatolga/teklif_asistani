import { Button, Group, Paper, Stack, Table, Text, Title } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../../lib/api";
import { showError } from "../../lib/errors";
import { tr } from "../../lib/i18n/tr";
import type { Customer, ProposalSummary } from "../../types";

export function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [proposals, setProposals] = useState<ProposalSummary[]>([]);

  useEffect(() => {
    if (!id) return;
    api.getCustomer(id).then(setCustomer).catch(showError);
    api.listProposals({ customer_id: id }).then(setProposals).catch(showError);
  }, [id]);

  if (!customer) return <Text>{tr.common.loading}</Text>;

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>{customer.name}</Title>
        <Group>
          <Button variant="default"
            onClick={() => nav(`/customers/${id}/edit`)}>
            {tr.common.edit}
          </Button>
          <Button leftSection={<IconPlus size={16} />}
            onClick={() => nav(`/proposals/new?customer=${id}`)}>
            {tr.proposal.newTitle}
          </Button>
        </Group>
      </Group>
      <Paper p="md" withBorder>
        <Stack gap="xs">
          <Text><b>{tr.customer.contact}:</b> {customer.contact_person || "—"}</Text>
          <Text><b>{tr.customer.phone}:</b> {customer.phone || "—"}</Text>
          <Text><b>{tr.customer.email}:</b> {customer.email || "—"}</Text>
          <Text><b>{tr.customer.address}:</b> {customer.address || "—"}</Text>
          {customer.tax_no && (
            <Text><b>{tr.customer.taxNo}:</b> {customer.tax_office} / {customer.tax_no}</Text>
          )}
          {customer.notes && <Text><b>{tr.customer.notes}:</b> {customer.notes}</Text>}
        </Stack>
      </Paper>
      <Title order={4}>{tr.proposal.plural}</Title>
      <Table highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Son Güncelleme</Table.Th>
            <Table.Th>{tr.proposal.title}</Table.Th>
            <Table.Th>Etkileşim</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {proposals.map((p) => (
            <Table.Tr key={p.id}>
              <Table.Td>
                {new Date(p.updated_at).toLocaleDateString("tr-TR")}
              </Table.Td>
              <Table.Td>
                <Link to={`/proposals/${p.id}/view`}>{p.title}</Link>
              </Table.Td>
              <Table.Td>{p.interaction_count}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Stack>
  );
}
