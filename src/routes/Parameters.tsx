import { Button, Group, Stack, Table, Text, Title, ActionIcon } from "@mantine/core";
import { IconEdit, IconTrash, IconGripVertical, IconPlus } from "@tabler/icons-react";
import { modals } from "@mantine/modals";
import { useState } from "react";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useParameters } from "../stores/parameters";
import { ParameterFormModal } from "../components/ParameterForm";
import type { Parameter } from "../types";
import { showError, showSuccess } from "../lib/errors";
import { tr } from "../lib/i18n/tr";

function Row({ param, onEdit, onDelete }: {
  param: Parameter; onEdit: () => void; onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: param.key });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <Table.Tr ref={setNodeRef} style={style}>
      <Table.Td {...attributes} {...listeners} style={{ cursor: "grab" }}>
        <IconGripVertical size={16} />
      </Table.Td>
      <Table.Td>{param.label}</Table.Td>
      <Table.Td><Text size="xs" c="dimmed">{param.key}</Text></Table.Td>
      <Table.Td>{tr.parameter.types[param.type]}</Table.Td>
      <Table.Td>{param.required ? "✓" : ""}</Table.Td>
      <Table.Td>
        <Group gap="xs">
          <ActionIcon variant="subtle" onClick={onEdit}><IconEdit size={16} /></ActionIcon>
          <ActionIcon variant="subtle" color="red" onClick={onDelete}><IconTrash size={16} /></ActionIcon>
        </Group>
      </Table.Td>
    </Table.Tr>
  );
}

export function ParametersPage() {
  const { catalog, upsert, remove, reorder } = useParameters();
  const [editing, setEditing] = useState<Parameter | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor));
  const params = catalog?.parameters ?? [];

  const onDragEnd = async (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const oldIndex = params.findIndex((p) => p.key === e.active.id);
    const newIndex = params.findIndex((p) => p.key === e.over!.id);
    const newOrder = arrayMove(params, oldIndex, newIndex);
    try {
      await reorder(newOrder.map((p) => p.key));
    } catch (err) { showError(err); }
  };

  const handleSave = async (param: Parameter) => {
    try {
      await upsert(param);
      showSuccess(tr.common.save + " ✓");
    } catch (err) { showError(err); }
  };

  const handleDelete = (key: string) => {
    modals.openConfirmModal({
      title: tr.common.delete,
      children: <Text size="sm">{tr.parameter.deleteWarn}</Text>,
      labels: { confirm: tr.common.delete, cancel: tr.common.cancel },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try { await remove(key); }
        catch (err) { showError(err); }
      },
    });
  };

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>{tr.parameter.plural}</Title>
        <Button leftSection={<IconPlus size={16} />}
          onClick={() => { setEditing(null); setModalOpen(true); }}>
          {tr.common.new}
        </Button>
      </Group>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext
          items={params.map((p) => p.key)}
          strategy={verticalListSortingStrategy}
        >
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th></Table.Th>
                <Table.Th>{tr.parameter.label}</Table.Th>
                <Table.Th>{tr.parameter.key}</Table.Th>
                <Table.Th>{tr.parameter.type}</Table.Th>
                <Table.Th>{tr.parameter.required}</Table.Th>
                <Table.Th></Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {params.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={6}>
                    <Text c="dimmed" ta="center">{tr.common.empty}</Text>
                  </Table.Td>
                </Table.Tr>
              )}
              {params.map((p) => (
                <Row key={p.key} param={p}
                  onEdit={() => { setEditing(p); setModalOpen(true); }}
                  onDelete={() => handleDelete(p.key)} />
              ))}
            </Table.Tbody>
          </Table>
        </SortableContext>
      </DndContext>
      <ParameterFormModal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        initial={editing ?? undefined}
        nextOrder={params.length + 1}
      />
    </Stack>
  );
}
