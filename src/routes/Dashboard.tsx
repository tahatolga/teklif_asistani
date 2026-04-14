import { Card, SimpleGrid, Stack, Table, Text, Title } from "@mantine/core";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { showError } from "../lib/errors";
import { tr } from "../lib/i18n/tr";
import type { AppInfo, ProposalSummary } from "../types";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card withBorder>
      <Text c="dimmed" size="sm">{label}</Text>
      <Text fz={28} fw={600}>{value}</Text>
    </Card>
  );
}

export function Dashboard() {
  const [info, setInfo] = useState<AppInfo | null>(null);
  const [recent, setRecent] = useState<ProposalSummary[]>([]);

  useEffect(() => {
    api.getAppInfo().then(setInfo).catch(showError);
    api.listProposals({}).then((list) => setRecent(list.slice(0, 10))).catch(showError);
  }, []);

  const now = new Date();
  const thisMonth = recent.filter((p) => {
    const d = new Date(p.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  if (!info) return <Text>{tr.common.loading}</Text>;

  if (info.proposal_count === 0 && info.customer_count === 0) {
    return (
      <Stack align="center" mt="xl">
        <Title order={3}>{tr.app.title}</Title>
        <Text c="dimmed">
          Henüz teklif yok — ilk müşterini ekleyerek başla
        </Text>
        <Link to="/customers/new">
          <Text c="blue">{tr.customer.newTitle} →</Text>
        </Link>
      </Stack>
    );
  }

  return (
    <Stack>
      <Title order={2}>{tr.nav.dashboard}</Title>
      <SimpleGrid cols={3}>
        <StatCard label={tr.customer.plural} value={info.customer_count} />
        <StatCard label={tr.proposal.plural} value={info.proposal_count} />
        <StatCard label="Bu ay" value={thisMonth} />
      </SimpleGrid>
      <Title order={4}>Son Teklifler</Title>
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{tr.customer.singular}</Table.Th>
            <Table.Th>{tr.proposal.title}</Table.Th>
            <Table.Th>Etkileşim</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {recent.map((p) => (
            <Table.Tr key={p.id}>
              <Table.Td>{p.customer_name}</Table.Td>
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
