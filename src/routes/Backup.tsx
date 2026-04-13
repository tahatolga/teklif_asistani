import { Button, Group, Stack, Table, Text, Title, ActionIcon, Radio } from "@mantine/core";
import { IconArchive, IconTrash, IconDownload } from "@tabler/icons-react";
import { modals } from "@mantine/modals";
import { open } from "@tauri-apps/plugin-dialog";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { showError, showSuccess } from "../lib/errors";
import { tr } from "../lib/i18n/tr";
import type { BackupEntry, RestoreMode } from "../types";

export function BackupPage() {
  const [entries, setEntries] = useState<BackupEntry[]>([]);

  const load = () => api.listBackups().then(setEntries).catch(showError);
  useEffect(() => { load(); }, []);

  const create = async () => {
    try {
      await api.createBackup();
      showSuccess("Yedek oluşturuldu");
      load();
    } catch (err) { showError(err); }
  };

  const del = (name: string) => {
    modals.openConfirmModal({
      title: `${name} silinsin mi?`,
      labels: { confirm: tr.common.delete, cancel: tr.common.cancel },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try { await api.deleteBackup(name); load(); }
        catch (err) { showError(err); }
      },
    });
  };

  const restore = async (path: string) => {
    let mode: RestoreMode = "merge";
    modals.open({
      title: tr.backup.restore,
      children: (
        <Stack>
          <Radio.Group defaultValue="merge"
            onChange={(v) => { mode = v as RestoreMode; }}>
            <Stack gap="xs">
              <Radio value="merge" label={tr.backup.merge} />
              <Radio value="replace" label={tr.backup.replace} />
            </Stack>
          </Radio.Group>
          <Text size="sm" c="dimmed">{tr.backup.replaceWarn}</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => modals.closeAll()}>
              {tr.common.cancel}
            </Button>
            <Button onClick={async () => {
              modals.closeAll();
              try {
                await api.restoreBackup(path, mode);
                showSuccess("Geri yüklendi");
                load();
              } catch (err) { showError(err); }
            }}>{tr.common.confirm}</Button>
          </Group>
        </Stack>
      ),
    });
  };

  const restoreExternal = async () => {
    const picked = await open({
      multiple: false, directory: false,
      filters: [{ name: "Zip", extensions: ["zip"] }],
    });
    if (typeof picked === "string") restore(picked);
  };

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>{tr.nav.backup}</Title>
        <Group>
          <Button leftSection={<IconArchive size={16} />} onClick={create}>
            {tr.backup.create}
          </Button>
          <Button variant="default"
            leftSection={<IconDownload size={16} />}
            onClick={restoreExternal}>
            {tr.backup.restore}
          </Button>
        </Group>
      </Group>
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Ad</Table.Th>
            <Table.Th>{tr.backup.createdAt}</Table.Th>
            <Table.Th>{tr.backup.size}</Table.Th>
            <Table.Th></Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {entries.length === 0 && (
            <Table.Tr>
              <Table.Td colSpan={4}>
                <Text c="dimmed" ta="center">{tr.common.empty}</Text>
              </Table.Td>
            </Table.Tr>
          )}
          {entries.map((e) => (
            <Table.Tr key={e.name}>
              <Table.Td>{e.name}</Table.Td>
              <Table.Td>
                {new Date(e.created_at).toLocaleString("tr-TR")}
              </Table.Td>
              <Table.Td>{(e.size_bytes / 1024).toFixed(1)} KB</Table.Td>
              <Table.Td>
                <Group gap="xs">
                  <Button size="xs" variant="subtle"
                    onClick={() => restore(e.path)}>
                    {tr.backup.restore}
                  </Button>
                  <ActionIcon variant="subtle" color="red"
                    onClick={() => del(e.name)}>
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
