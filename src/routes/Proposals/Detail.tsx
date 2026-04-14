import {
  ActionIcon, Autocomplete, Badge, Button, Divider, Group, Menu,
  NativeSelect, NumberInput, Paper, Stack, Table, Text, Textarea,
  TextInput, Title,
} from "@mantine/core";
import {
  IconArrowLeft, IconDotsVertical, IconFile, IconPaperclip,
  IconPlus, IconTrash,
} from "@tabler/icons-react";
import { modals } from "@mantine/modals";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../../lib/api";
import { showError } from "../../lib/errors";
import { tr } from "../../lib/i18n/tr";
import { useParameters } from "../../stores/parameters";
import type {
  CostItem, CostLine, Customer, Interaction, InteractionDirection,
  InteractionRow, Proposal, RowValueType,
} from "../../types";

const valueTypeLabels: Record<RowValueType, string> = {
  text: "Kısa yazı",
  textarea: "Uzun yazı",
  number: "Sayı",
  price: "Fiyat",
  file: "Dosya",
};

const valueTypeOrder: RowValueType[] =
  ["text", "textarea", "number", "price", "file"];

const currencies = ["TRY", "EUR", "USD"];

function getPriceAmount(v: unknown): number {
  if (v && typeof v === "object" && v !== null && "amount" in v) {
    const a = (v as { amount: unknown }).amount;
    if (typeof a === "number") return a;
  }
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/\./g, "").replace(",", "."));
    if (!isNaN(n)) return n;
  }
  return 0;
}

function getPriceCurrency(v: unknown): string {
  if (v && typeof v === "object" && v !== null && "currency" in v) {
    const c = (v as { currency: unknown }).currency;
    if (typeof c === "string" && currencies.includes(c)) return c;
  }
  return "TRY";
}

const directionLabels: Record<InteractionDirection, string> = {
  incoming: "Müşteriden Gelen",
  outgoing: "Müşteriye Giden",
  internal: "İç Not",
};

const directionColors: Record<InteractionDirection, string> = {
  incoming: "blue",
  outgoing: "teal",
  internal: "gray",
};

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `int-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function inferValue(raw: string): unknown {
  const trimmed = raw.trim();
  if (trimmed === "") return "";
  const normalized = trimmed.includes(",")
    ? trimmed.replace(/\./g, "").replace(",", ".")
    : trimmed;
  if (/^-?\d+(\.\d+)?$/.test(normalized)) {
    const n = Number(normalized);
    if (!isNaN(n) && isFinite(n)) return n;
  }
  return trimmed;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return value.toLocaleString("tr-TR");
  if (typeof value === "boolean") return value ? "Evet" : "Hayır";
  if (value && typeof value === "object" && "amount" in value) {
    const v = value as { amount: unknown; currency: unknown };
    const amt = typeof v.amount === "number" ? v.amount : 0;
    const cur = typeof v.currency === "string" ? v.currency : "";
    return `${amt.toLocaleString("tr-TR")} ${cur}`.trim();
  }
  return String(value);
}

export function ProposalDetail() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const catalog = useParameters((s) => s.catalog);
  const ensureParam = useParameters((s) => s.ensure);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [costs, setCosts] = useState<CostItem[]>([]);
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    api.getCosts().then((c) => setCosts(c.items)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) return;
    api.getProposal(id).then((p) => {
      setProposal(p);
      api.getCustomer(p.customer_id).then(setCustomer).catch(() => {});
    }).catch(showError);
    return () => {
      if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    };
  }, [id]);

  const persist = (next: Proposal, immediate = false) => {
    setProposal(next);
    if (!id) return;
    if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    const run = () => {
      api.updateProposal(id, {
        customer_id: next.customer_id,
        title: next.title,
        notes: next.notes,
        interactions: next.interactions,
        cost_lines: next.cost_lines,
      }).catch(showError);
    };
    if (immediate) run();
    else saveTimer.current = window.setTimeout(run, 400);
  };

  const addInteraction = (direction: InteractionDirection) => {
    if (!proposal) return;
    const interaction: Interaction = {
      id: newId(),
      direction,
      created_at: new Date().toISOString(),
      rows: [],
    };
    persist({
      ...proposal,
      interactions: [interaction, ...proposal.interactions],
    }, true);
  };

  const updateInteraction = (next: Interaction) => {
    if (!proposal) return;
    persist({
      ...proposal,
      interactions: proposal.interactions.map((i) =>
        i.id === next.id ? next : i),
    });
  };

  const removeInteraction = (interactionId: string) => {
    if (!proposal) return;
    modals.openConfirmModal({
      title: "Etkileşim silinsin mi?",
      labels: { confirm: tr.common.delete, cancel: tr.common.cancel },
      confirmProps: { color: "red" },
      onConfirm: () => {
        persist({
          ...proposal,
          interactions: proposal.interactions.filter((i) =>
            i.id !== interactionId),
        }, true);
      },
    });
  };

  if (!proposal) return <Text>{tr.common.loading}</Text>;

  const sortedInteractions = [...proposal.interactions].sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <Stack>
      <Group>
        <Button variant="subtle" size="xs"
          leftSection={<IconArrowLeft size={14} />}
          onClick={() => nav("/proposals")}>
          {tr.proposal.plural}
        </Button>
      </Group>

      <Paper p="md" withBorder>
        <Stack>
          <Text size="sm" c="dimmed">{tr.customer.singular}</Text>
          {customer ? (
            <Link to={`/customers/${customer.id}`}
              style={{ fontSize: 16, fontWeight: 500 }}>
              {customer.name}
            </Link>
          ) : (
            <Text>{proposal.customer_id}</Text>
          )}
          <TextInput
            label={tr.proposal.title}
            value={proposal.title}
            onChange={(e) => persist({
              ...proposal, title: e.currentTarget.value,
            })}
            onBlur={() => persist(proposal, true)}
          />
          <Textarea
            label={tr.proposal.notes}
            autosize minRows={3}
            value={proposal.notes}
            onChange={(e) => persist({
              ...proposal, notes: e.currentTarget.value,
            })}
            onBlur={() => persist(proposal, true)}
          />
        </Stack>
      </Paper>

      <ProposalCostSection
        costs={costs}
        costLines={proposal.cost_lines}
        onChange={(next) => persist({ ...proposal, cost_lines: next })}
      />

      <Group justify="space-between">
        <Title order={3}>Etkileşimler</Title>
        <Menu position="bottom-end">
          <Menu.Target>
            <Button leftSection={<IconPlus size={16} />}>
              Yeni Etkileşim
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item onClick={() => addInteraction("incoming")}>
              {directionLabels.incoming}
            </Menu.Item>
            <Menu.Item onClick={() => addInteraction("outgoing")}>
              {directionLabels.outgoing}
            </Menu.Item>
            <Menu.Item onClick={() => addInteraction("internal")}>
              {directionLabels.internal}
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>

      {sortedInteractions.length === 0 && (
        <Text c="dimmed" ta="center">Henüz etkileşim yok</Text>
      )}

      {sortedInteractions.map((interaction) => (
        <InteractionCard
          key={interaction.id}
          proposalId={proposal.id}
          interaction={interaction}
          parameters={catalog?.parameters ?? []}
          onChange={updateInteraction}
          onDelete={() => removeInteraction(interaction.id)}
          onEnsureKey={(key) => { ensureParam(key).catch(() => {}); }}
        />
      ))}
    </Stack>
  );
}

interface CostSectionProps {
  costs: CostItem[];
  costLines: CostLine[];
  onChange: (next: CostLine[]) => void;
}

function ProposalCostSection({ costs, costLines, onChange }: CostSectionProps) {
  const [ghostCostId, setGhostCostId] = useState<string>("");
  const [ghostQty, setGhostQty] = useState<number | "">("");

  const findCost = (costId: string): CostItem | undefined =>
    costs.find((c) => c.id === costId);

  const updateLine = (idx: number, patch: Partial<CostLine>) => {
    onChange(costLines.map((l, i) => i === idx ? { ...l, ...patch } : l));
  };

  const removeLine = (idx: number) => {
    onChange(costLines.filter((_, i) => i !== idx));
  };

  const commitGhost = () => {
    if (!ghostCostId) return;
    const qty = typeof ghostQty === "number" ? ghostQty : 0;
    if (qty <= 0) return;
    onChange([...costLines, { cost_id: ghostCostId, quantity: qty }]);
    setGhostCostId("");
    setGhostQty("");
  };

  const costOptions = costs.map((c) => ({
    value: c.id,
    label: `${c.label} — ${c.amount.toLocaleString("tr-TR")} ${c.currency}`,
  }));

  const totalsByCurrency: Record<string, number> = {};
  for (const line of costLines) {
    const cost = findCost(line.cost_id);
    if (!cost) continue;
    totalsByCurrency[cost.currency] =
      (totalsByCurrency[cost.currency] ?? 0) + cost.amount * line.quantity;
  }

  return (
    <Paper p="md" withBorder>
      <Title order={3} mb="sm">Maliyet Kalemleri</Title>
      {costs.length === 0 && (
        <Text size="sm" c="dimmed">
          Önce Maliyetler sayfasından fabrika birim maliyetlerini ekleyin.
        </Text>
      )}
      {costs.length > 0 && (
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Kalem</Table.Th>
              <Table.Th style={{ width: 140 }}>Miktar</Table.Th>
              <Table.Th style={{ width: 160 }}>Birim</Table.Th>
              <Table.Th style={{ width: 180 }}>Toplam</Table.Th>
              <Table.Th style={{ width: 40 }}></Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {costLines.map((line, idx) => {
              const cost = findCost(line.cost_id);
              const total = cost ? cost.amount * line.quantity : 0;
              return (
                <Table.Tr key={idx}>
                  <Table.Td>
                    <NativeSelect
                      value={line.cost_id}
                      data={[
                        { value: "", label: "Seçin..." },
                        ...costOptions,
                      ]}
                      onChange={(e) => updateLine(idx, {
                        cost_id: e.currentTarget.value,
                      })}
                    />
                  </Table.Td>
                  <Table.Td>
                    <NumberInput
                      defaultValue={line.quantity}
                      min={0}
                      decimalScale={2}
                      thousandSeparator="."
                      decimalSeparator=","
                      onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                        const raw = e.currentTarget.value
                          .replace(/\./g, "")
                          .replace(",", ".");
                        const n = Number(raw);
                        if (!isNaN(n)) updateLine(idx, { quantity: n });
                      }}
                    />
                  </Table.Td>
                  <Table.Td>
                    {cost ? (
                      <Text size="sm">
                        {cost.amount.toLocaleString("tr-TR")} {cost.currency}
                      </Text>
                    ) : <Text size="sm" c="dimmed">—</Text>}
                  </Table.Td>
                  <Table.Td>
                    {cost ? (
                      <Text size="sm" fw={500}>
                        {total.toLocaleString("tr-TR")} {cost.currency}
                      </Text>
                    ) : <Text size="sm" c="dimmed">—</Text>}
                  </Table.Td>
                  <Table.Td>
                    <ActionIcon variant="subtle" color="red"
                      onClick={() => removeLine(idx)}>
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Table.Td>
                </Table.Tr>
              );
            })}
            <Table.Tr>
              <Table.Td>
                <NativeSelect
                  value={ghostCostId}
                  data={[
                    { value: "", label: "Kalem seçin..." },
                    ...costOptions,
                  ]}
                  onChange={(e) => setGhostCostId(e.currentTarget.value)}
                  onBlur={commitGhost}
                />
              </Table.Td>
              <Table.Td>
                <NumberInput
                  value={ghostQty}
                  min={0}
                  decimalScale={2}
                  thousandSeparator="."
                  decimalSeparator=","
                  placeholder="Miktar"
                  onChange={(v: string | number) =>
                    setGhostQty(typeof v === "number" ? v : "")}
                  onBlur={commitGhost}
                />
              </Table.Td>
              <Table.Td colSpan={3}></Table.Td>
            </Table.Tr>
          </Table.Tbody>
        </Table>
      )}
      {Object.keys(totalsByCurrency).length > 0 && (
        <Group justify="flex-end" gap="md" mt="sm">
          <Text size="sm" c="dimmed">Toplam:</Text>
          {Object.entries(totalsByCurrency).map(([cur, sum]) => (
            <Badge key={cur} size="lg" variant="light">
              {sum.toLocaleString("tr-TR")} {cur}
            </Badge>
          ))}
        </Group>
      )}
    </Paper>
  );
}

interface CardProps {
  proposalId: string;
  interaction: Interaction;
  parameters: { key: string; label: string; unit: string | null }[];
  onChange: (next: Interaction) => void;
  onDelete: () => void;
  onEnsureKey: (key: string) => void;
}

function InteractionCard({
  proposalId, interaction, parameters,
  onChange, onDelete, onEnsureKey,
}: CardProps) {
  const [ghostKey, setGhostKey] = useState("");
  const [ghostValue, setGhostValue] = useState("");
  const [ghostType, setGhostType] = useState<RowValueType>("text");
  const [ghostCurrency, setGhostCurrency] = useState("TRY");

  const autocompleteData = parameters.map((p) => ({
    value: p.key,
    label: p.unit ? `${p.label} (${p.unit})` : p.label,
  }));

  const labelFor = (key: string): string => {
    const found = parameters.find((p) => p.key === key);
    if (!found) return key;
    return found.unit ? `${found.label} (${found.unit})` : found.label;
  };

  const updateRow = (idx: number, patch: Partial<InteractionRow>) => {
    const rows = interaction.rows.map((r, i) =>
      i === idx ? { ...r, ...patch } : r);
    onChange({ ...interaction, rows });
  };

  const commitRowValue = (idx: number, raw: string, vt: RowValueType) => {
    const value = vt === "number" ? inferValue(raw)
      : vt === "file" ? interaction.rows[idx].value
      : raw;
    updateRow(idx, { value });
  };

  const commitRowKey = (idx: number, newKey: string) => {
    const trimmed = newKey.trim();
    if (trimmed === "") return;
    updateRow(idx, { key: trimmed });
    if (!parameters.some((p) => p.key === trimmed)) {
      onEnsureKey(trimmed);
    }
  };

  const changeRowType = (idx: number, vt: RowValueType) => {
    const current = interaction.rows[idx];
    let value: unknown = current.value;
    if (vt === "number") value = inferValue(String(current.value ?? ""));
    else if (vt === "text" || vt === "textarea") {
      if (current.value_type === "price") {
        const amt = getPriceAmount(current.value);
        const cur = getPriceCurrency(current.value);
        value = amt > 0 ? `${amt.toLocaleString("tr-TR")} ${cur}` : "";
      } else {
        value = String(current.value ?? "");
      }
    } else if (vt === "price") {
      value = {
        amount: getPriceAmount(current.value),
        currency: getPriceCurrency(current.value),
      };
    } else if (vt === "file") value = "";
    updateRow(idx, { value_type: vt, value });
  };

  const removeRow = (idx: number) => {
    const rows = interaction.rows.filter((_, i) => i !== idx);
    onChange({ ...interaction, rows });
  };

  const pickAndUploadFile = async (
    onDone: (relPath: string, filename: string) => void,
  ) => {
    try {
      const selected = await openDialog({ multiple: false });
      if (!selected || typeof selected !== "string") return;
      const rel = await api.uploadAttachment(
        proposalId, interaction.id, selected,
      );
      const filename = rel.split("/").pop() ?? rel;
      onDone(rel, filename);
    } catch (err) { showError(err); }
  };

  const commitGhost = () => {
    const k = ghostKey.trim();
    if (k === "") return;
    let rawValue: unknown;
    if (ghostType === "number") rawValue = inferValue(ghostValue);
    else if (ghostType === "price") {
      const raw = ghostValue.replace(/\./g, "").replace(",", ".");
      const n = Number(raw);
      rawValue = { amount: isNaN(n) ? 0 : n, currency: ghostCurrency };
    } else rawValue = ghostValue;
    const row: InteractionRow = {
      key: k,
      value: rawValue,
      value_type: ghostType,
    };
    onChange({ ...interaction, rows: [...interaction.rows, row] });
    if (!parameters.some((p) => p.key === k)) onEnsureKey(k);
    setGhostKey("");
    setGhostValue("");
    setGhostType("text");
    setGhostCurrency("TRY");
  };

  const renderValueCell = (row: InteractionRow, idx: number) => {
    const vt = row.value_type ?? "text";
    if (vt === "textarea") {
      return (
        <Textarea
          autosize minRows={1} maxRows={6}
          defaultValue={String(row.value ?? "")}
          onBlur={(e) => commitRowValue(idx, e.currentTarget.value, vt)}
          placeholder="Değer"
        />
      );
    }
    if (vt === "price") {
      const amount = getPriceAmount(row.value);
      const currency = getPriceCurrency(row.value);
      return (
        <Group gap="xs" wrap="nowrap">
          <NumberInput
            defaultValue={amount}
            min={0}
            decimalScale={2}
            thousandSeparator="."
            decimalSeparator=","
            style={{ flex: 1 }}
            onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
              const raw = e.currentTarget.value
                .replace(/\./g, "")
                .replace(",", ".");
              const n = Number(raw);
              if (!isNaN(n)) {
                updateRow(idx, { value: { amount: n, currency } });
              }
            }}
          />
          <NativeSelect
            value={currency}
            data={currencies}
            onChange={(e) =>
              updateRow(idx, {
                value: { amount, currency: e.currentTarget.value },
              })}
          />
        </Group>
      );
    }
    if (vt === "file") {
      const rel = typeof row.value === "string" ? row.value : "";
      const filename = rel ? (rel.split("/").pop() ?? rel) : "";
      return (
        <Group gap="xs" wrap="nowrap">
          {rel ? (
            <Button variant="subtle" size="xs"
              leftSection={<IconFile size={14} />}
              onClick={() => api.openAttachment(rel).catch(showError)}>
              {filename}
            </Button>
          ) : (
            <Text size="sm" c="dimmed">Dosya seçilmedi</Text>
          )}
          <Button variant="light" size="xs"
            leftSection={<IconPaperclip size={14} />}
            onClick={() => pickAndUploadFile((relPath) =>
              updateRow(idx, { value: relPath }))}>
            {rel ? "Değiştir" : "Dosya Seç"}
          </Button>
        </Group>
      );
    }
    return (
      <TextInput
        defaultValue={formatValue(row.value)}
        onBlur={(e) => commitRowValue(idx, e.currentTarget.value, vt)}
        placeholder="Değer"
      />
    );
  };

  return (
    <Paper p="md" withBorder>
      <Group justify="space-between" mb="sm">
        <Group gap="sm">
          <Badge color={directionColors[interaction.direction]}
            variant="light">
            {directionLabels[interaction.direction]}
          </Badge>
          <Text size="sm" c="dimmed">
            {new Date(interaction.created_at).toLocaleString("tr-TR")}
          </Text>
        </Group>
        <Menu position="bottom-end">
          <Menu.Target>
            <ActionIcon variant="subtle">
              <IconDotsVertical size={16} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item color="red" leftSection={<IconTrash size={14} />}
              onClick={onDelete}>
              Etkileşimi Sil
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
      <Divider mb="sm" />
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th style={{ width: "32%" }}>Alan</Table.Th>
            <Table.Th style={{ width: 140 }}>Tip</Table.Th>
            <Table.Th>Değer</Table.Th>
            <Table.Th style={{ width: 40 }}></Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {interaction.rows.map((row, idx) => (
            <Table.Tr key={idx}>
              <Table.Td>
                <Autocomplete
                  value={labelFor(row.key)}
                  data={autocompleteData}
                  onChange={(v) => updateRow(idx, { key: v })}
                  onBlur={(e) => commitRowKey(idx, e.currentTarget.value)}
                  placeholder="Alan adı"
                />
              </Table.Td>
              <Table.Td>
                <NativeSelect
                  value={row.value_type ?? "text"}
                  data={valueTypeOrder.map((v) => ({
                    value: v, label: valueTypeLabels[v],
                  }))}
                  onChange={(e) =>
                    changeRowType(idx, e.currentTarget.value as RowValueType)}
                />
              </Table.Td>
              <Table.Td>{renderValueCell(row, idx)}</Table.Td>
              <Table.Td>
                <ActionIcon variant="subtle" color="red"
                  onClick={() => removeRow(idx)}>
                  <IconTrash size={14} />
                </ActionIcon>
              </Table.Td>
            </Table.Tr>
          ))}
          <Table.Tr>
            <Table.Td>
              <Autocomplete
                value={ghostKey}
                data={autocompleteData}
                onChange={setGhostKey}
                onBlur={commitGhost}
                placeholder="Yeni alan..."
              />
            </Table.Td>
            <Table.Td>
              <NativeSelect
                value={ghostType}
                data={valueTypeOrder.map((v) => ({
                  value: v, label: valueTypeLabels[v],
                }))}
                onChange={(e) =>
                  setGhostType(e.currentTarget.value as RowValueType)}
              />
            </Table.Td>
            <Table.Td>
              {ghostType === "file" ? (
                <Button variant="light" size="xs"
                  leftSection={<IconPaperclip size={14} />}
                  disabled={!ghostKey.trim()}
                  onClick={() => pickAndUploadFile((relPath, filename) => {
                    const row: InteractionRow = {
                      key: ghostKey.trim(),
                      value: relPath,
                      value_type: "file",
                    };
                    onChange({
                      ...interaction,
                      rows: [...interaction.rows, row],
                    });
                    if (!parameters.some((p) => p.key === row.key)) {
                      onEnsureKey(row.key);
                    }
                    setGhostKey("");
                    setGhostValue("");
                    setGhostType("text");
                    void filename;
                  })}>
                  Dosya Seç
                </Button>
              ) : ghostType === "textarea" ? (
                <Textarea
                  autosize minRows={1} maxRows={4}
                  value={ghostValue}
                  onChange={(e) => setGhostValue(e.currentTarget.value)}
                  onBlur={commitGhost}
                  placeholder="Değer"
                />
              ) : ghostType === "price" ? (
                <Group gap="xs" wrap="nowrap">
                  <TextInput
                    value={ghostValue}
                    onChange={(e) => setGhostValue(e.currentTarget.value)}
                    onBlur={commitGhost}
                    placeholder="0,00"
                    style={{ flex: 1 }}
                  />
                  <NativeSelect
                    value={ghostCurrency}
                    data={currencies}
                    onChange={(e) => setGhostCurrency(e.currentTarget.value)}
                  />
                </Group>
              ) : (
                <TextInput
                  value={ghostValue}
                  onChange={(e) => setGhostValue(e.currentTarget.value)}
                  onBlur={commitGhost}
                  placeholder="Değer"
                />
              )}
            </Table.Td>
            <Table.Td></Table.Td>
          </Table.Tr>
        </Table.Tbody>
      </Table>
    </Paper>
  );
}
