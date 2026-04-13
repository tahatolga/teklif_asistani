import { Button, Group, Paper, Select, Stack, Switch, TextInput, Title, Text } from "@mantine/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { showError, showSuccess } from "../lib/errors";
import { useSettings } from "../stores/settings";
import { tr } from "../lib/i18n/tr";
import type { AppInfo } from "../types";

export function SettingsPage() {
  const { settings, load, update } = useSettings();
  const [info, setInfo] = useState<AppInfo | null>(null);

  useEffect(() => {
    load().catch(showError);
    api.getAppInfo().then(setInfo).catch(showError);
  }, []);

  if (!settings) return <Text>{tr.common.loading}</Text>;

  const changeDataDir = async () => {
    const picked = await open({ directory: true, multiple: false });
    if (typeof picked === "string") {
      try {
        await api.initDataDir(picked);
        await load();
        showSuccess("Veri klasörü değişti");
      } catch (err) { showError(err); }
    }
  };

  return (
    <Stack>
      <Title order={2}>{tr.nav.settings}</Title>
      <Paper p="md" withBorder>
        <Stack>
          <Group align="flex-end">
            <TextInput label={tr.settings.dataDir} readOnly
              value={settings.data_dir} style={{ flex: 1 }} />
            <Button variant="default" onClick={changeDataDir}>
              Değiştir
            </Button>
          </Group>
          <Select label={tr.settings.defaultCurrency}
            data={["TRY", "EUR", "USD"]}
            value={settings.default_currency}
            onChange={(v) => v && update({ default_currency: v })}
          />
          <Switch label={tr.settings.autoUpdate}
            checked={settings.auto_update_enabled}
            onChange={(e) =>
              update({ auto_update_enabled: e.currentTarget.checked })}
          />
          {info && (
            <Text size="sm" c="dimmed">
              {tr.settings.version}: {info.version}
            </Text>
          )}
        </Stack>
      </Paper>
    </Stack>
  );
}
