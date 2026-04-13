import { useEffect } from "react";
import { useBlocker } from "react-router-dom";
import { modals } from "@mantine/modals";
import { Text } from "@mantine/core";

export function UnsavedGuard({ dirty }: { dirty: boolean }) {
  const blocker = useBlocker(dirty);

  useEffect(() => {
    if (blocker.state === "blocked") {
      modals.openConfirmModal({
        title: "Kaydedilmemiş değişiklikler",
        children: (
          <Text size="sm">
            Bu sayfadan ayrılırsanız değişiklikler kaybolacak. Devam edilsin mi?
          </Text>
        ),
        labels: { confirm: "Ayrıl", cancel: "Kalmaya devam" },
        confirmProps: { color: "red" },
        onConfirm: () => blocker.proceed?.(),
        onCancel: () => blocker.reset?.(),
      });
    }
  }, [blocker]);

  return null;
}
