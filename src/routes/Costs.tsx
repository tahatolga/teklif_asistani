import {
  ActionIcon, NativeSelect, NumberInput, Paper, Stack, Table,
  Text, TextInput, Textarea, Title,
} from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { showError } from "../lib/errors";
import { tr } from "../lib/i18n/tr";
import type { CostItem } from "../types";

const currencies = ["TRY", "EUR", "USD"];

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `cost-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function CostsPage() {
  const [items, setItems] = useState<CostItem[]>([]);
  const [ghostLabel, setGhostLabel] = useState("");
  const [ghostAmount, setGhostAmount] = useState<number | "">("");
  const [ghostCurrency, setGhostCurrency] = useState("TRY");
  const [ghostNotes, setGhostNotes] = useState("");
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    api.getCosts().then((c) => setItems(c.items)).catch(showError);
    return () => {
      if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    };
  }, []);

  const persist = (next: CostItem[], immediate = false) => {
    setItems(next);
    if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    const run = () => { api.saveCosts(next).catch(showError); };
    if (immediate) run();
    else saveTimer.current = window.setTimeout(run, 400);
  };

  const updateItem = (idx: number, patch: Partial<CostItem>) => {
    const next = items.map((it, i) => i === idx
      ? { ...it, ...patch, updated_at: new Date().toISOString() }
      : it);
    persist(next);
  };

  const removeItem = (idx: number) => {
    persist(items.filter((_, i) => i !== idx), true);
  };

  const commitGhost = () => {
    const label = ghostLabel.trim();
    if (label === "") return;
    const newItem: CostItem = {
      id: newId(),
      label,
      amount: typeof ghostAmount === "number" ? ghostAmount : 0,
      currency: ghostCurrency,
      notes: ghostNotes.trim(),
      updated_at: new Date().toISOString(),
    };
    persist([...items, newItem], true);
    setGhostLabel("");
    setGhostAmount("");
    setGhostCurrency("TRY");
    setGhostNotes("");
  };

  return (
    <Stack>
      <Title order={2}>{tr.nav.costs}</Title>
      <Text c="dimmed" size="sm">
        Fabrikanızın birim maliyetlerini buradan yönetin (örn. CNC saatlik
        ücret, kaynak saatlik ücret, malzeme fiyatı). Alt satıra bir kalem
        yazdığınızda otomatik kaydedilir.
      </Text>
      <Paper p="md" withBorder>
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ width: "30%" }}>Kalem</Table.Th>
              <Table.Th style={{ width: 160 }}>Tutar</Table.Th>
              <Table.Th style={{ width: 120 }}>Para Birimi</Table.Th>
              <Table.Th>Not</Table.Th>
              <Table.Th style={{ width: 40 }}></Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {items.map((it, idx) => (
              <Table.Tr key={it.id}>
                <Table.Td>
                  <TextInput
                    defaultValue={it.label}
                    onBlur={(e) => updateItem(idx, {
                      label: e.currentTarget.value,
                    })}
                  />
                </Table.Td>
                <Table.Td>
                  <NumberInput
                    defaultValue={it.amount}
                    min={0}
                    decimalScale={2}
                    thousandSeparator="."
                    decimalSeparator=","
                    onBlur={(e) => {
                      const raw = e.currentTarget.value
                        .replace(/\./g, "")
                        .replace(",", ".");
                      const n = Number(raw);
                      if (!isNaN(n)) updateItem(idx, { amount: n });
                    }}
                  />
                </Table.Td>
                <Table.Td>
                  <NativeSelect
                    value={it.currency}
                    data={currencies}
                    onChange={(e) => updateItem(idx, {
                      currency: e.currentTarget.value,
                    })}
                  />
                </Table.Td>
                <Table.Td>
                  <Textarea
                    autosize minRows={1} maxRows={3}
                    defaultValue={it.notes}
                    onBlur={(e) => updateItem(idx, {
                      notes: e.currentTarget.value,
                    })}
                  />
                </Table.Td>
                <Table.Td>
                  <ActionIcon variant="subtle" color="red"
                    onClick={() => removeItem(idx)}>
                    <IconTrash size={14} />
                  </ActionIcon>
                </Table.Td>
              </Table.Tr>
            ))}
            <Table.Tr>
              <Table.Td>
                <TextInput
                  value={ghostLabel}
                  onChange={(e) => setGhostLabel(e.currentTarget.value)}
                  onBlur={commitGhost}
                  placeholder="Yeni kalem..."
                />
              </Table.Td>
              <Table.Td>
                <NumberInput
                  value={ghostAmount}
                  min={0}
                  decimalScale={2}
                  thousandSeparator="."
                  decimalSeparator=","
                  onChange={(v) =>
                    setGhostAmount(typeof v === "number" ? v : "")}
                  onBlur={commitGhost}
                />
              </Table.Td>
              <Table.Td>
                <NativeSelect
                  value={ghostCurrency}
                  data={currencies}
                  onChange={(e) => setGhostCurrency(e.currentTarget.value)}
                />
              </Table.Td>
              <Table.Td>
                <Textarea
                  autosize minRows={1} maxRows={3}
                  value={ghostNotes}
                  onChange={(e) => setGhostNotes(e.currentTarget.value)}
                  onBlur={commitGhost}
                  placeholder="Opsiyonel"
                />
              </Table.Td>
              <Table.Td></Table.Td>
            </Table.Tr>
          </Table.Tbody>
        </Table>
      </Paper>
    </Stack>
  );
}
