import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { modals } from "@mantine/modals";
import { Stack, Text } from "@mantine/core";
import { useSettings } from "./stores/settings";
import { useParameters } from "./stores/parameters";
import { tr } from "./lib/i18n/tr";

export default function App() {
  const loadSettings = useSettings((s) => s.load);
  const loadParameters = useParameters((s) => s.load);
  const settings = useSettings((s) => s.settings);
  const nav = useNavigate();

  useEffect(() => {
    loadSettings().catch(() => {});
    loadParameters().catch(() => {});
  }, [loadSettings, loadParameters]);

  useEffect(() => {
    if (!settings?.auto_update_enabled) return;
    let cancelled = false;
    (async () => {
      try {
        const update = await check();
        if (cancelled || !update) return;
        if (settings.skipped_version === update.version) return;
        modals.openConfirmModal({
          title: tr.update.available,
          children: (
            <Stack gap="xs">
              <Text size="sm">Yeni sürüm: <b>{update.version}</b></Text>
              {update.body && <Text size="sm" c="dimmed">{update.body}</Text>}
            </Stack>
          ),
          labels: { confirm: tr.update.install, cancel: tr.update.later },
          onConfirm: async () => {
            try {
              await update.downloadAndInstall();
              await relaunch();
            } catch { /* ignore, user will be notified via network error */ }
          },
        });
      } catch { /* silent on startup */ }
    })();
    return () => { cancelled = true; };
  }, [settings?.auto_update_enabled, settings?.skipped_version]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        nav("/proposals/new");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [nav]);

  return <Outlet />;
}
