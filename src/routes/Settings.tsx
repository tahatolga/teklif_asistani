import { Button, Group, Paper, Select, Stack, Switch, TextInput, Title, Text } from "@mantine/core";
import { open } from "@tauri-apps/plugin-dialog";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { modals } from "@mantine/modals";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { showError, showSuccess } from "../lib/errors";
import { useSettings } from "../stores/settings";
import { tr } from "../lib/i18n/tr";
import type { AppInfo } from "../types";

export function SettingsPage() {
  const { settings, load, update } = useSettings();
  const [info, setInfo] = useState<AppInfo | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    load().catch(showError);
    api.getAppInfo().then(setInfo).catch(showError);
  }, []);

  const checkForUpdates = async () => {
    setChecking(true);
    try {
      const update = await check();
      if (!update) {
        showSuccess("En son sürümü kullanıyorsunuz");
        return;
      }
      modals.openConfirmModal({
        title: tr.update.available,
        children: (
          <Stack gap="xs">
            <Text size="sm">
              Yeni sürüm: <b>{update.version}</b>
              {info ? ` (şu an ${info.version})` : ""}
            </Text>
            {update.body && (
              <Text size="sm" c="dimmed">{update.body}</Text>
            )}
          </Stack>
        ),
        labels: { confirm: tr.update.install, cancel: tr.update.later },
        onConfirm: async () => {
          try {
            await update.downloadAndInstall();
            await relaunch();
          } catch (err) { showError(err); }
        },
      });
    } catch (err) { showError(err); }
    finally { setChecking(false); }
  };

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
          <Group>
            <Button variant="default" onClick={checkForUpdates}
              loading={checking}>
              {tr.settings.checkNow}
            </Button>
            {info && (
              <Text size="sm" c="dimmed">
                {tr.settings.version}: {info.version}
              </Text>
            )}
          </Group>
        </Stack>
      </Paper>
    </Stack>
  );
}
