import { AppShell as MShell, NavLink, Title } from "@mantine/core";
import {
  IconDashboard, IconUsers, IconFileText, IconSettings,
  IconAdjustments, IconArchive,
} from "@tabler/icons-react";
import { NavLink as RLink, Outlet, useLocation } from "react-router-dom";
import { tr } from "../lib/i18n/tr";

const items = [
  { to: "/", label: tr.nav.dashboard, icon: IconDashboard },
  { to: "/customers", label: tr.nav.customers, icon: IconUsers },
  { to: "/proposals", label: tr.nav.proposals, icon: IconFileText },
  { to: "/parameters", label: tr.nav.parameters, icon: IconAdjustments },
  { to: "/backup", label: tr.nav.backup, icon: IconArchive },
  { to: "/settings", label: tr.nav.settings, icon: IconSettings },
];

export function AppShell() {
  const loc = useLocation();
  return (
    <MShell
      header={{ height: 50 }}
      navbar={{ width: 220, breakpoint: "sm" }}
      padding="md"
    >
      <MShell.Header p="sm">
        <Title order={4}>{tr.app.title}</Title>
      </MShell.Header>
      <MShell.Navbar p="xs">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            component={RLink}
            to={to}
            label={label}
            leftSection={<Icon size={18} />}
            active={to === "/" ? loc.pathname === "/" : loc.pathname.startsWith(to)}
          />
        ))}
      </MShell.Navbar>
      <MShell.Main>
        <Outlet />
      </MShell.Main>
    </MShell>
  );
}
