import { useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { Dashboard } from "./routes/Dashboard";
import { CustomersList } from "./routes/Customers/List";
import { CustomerDetail } from "./routes/Customers/Detail";
import { CustomerForm } from "./routes/Customers/Form";
import { ProposalsList } from "./routes/Proposals/List";
import { ProposalForm } from "./routes/Proposals/Form";
import { ParametersPage } from "./routes/Parameters";
import { BackupPage } from "./routes/Backup";
import { SettingsPage } from "./routes/Settings";
import { useSettings } from "./stores/settings";
import { useParameters } from "./stores/parameters";

export default function App() {
  const loadSettings = useSettings((s) => s.load);
  const loadParameters = useParameters((s) => s.load);
  const nav = useNavigate();

  useEffect(() => {
    loadSettings().catch(() => {});
    loadParameters().catch(() => {});
  }, [loadSettings, loadParameters]);

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

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/customers" element={<CustomersList />} />
        <Route path="/customers/new" element={<CustomerForm />} />
        <Route path="/customers/:id" element={<CustomerDetail />} />
        <Route path="/customers/:id/edit" element={<CustomerForm />} />
        <Route path="/proposals" element={<ProposalsList />} />
        <Route path="/proposals/new" element={<ProposalForm />} />
        <Route path="/proposals/:id" element={<ProposalForm />} />
        <Route path="/parameters" element={<ParametersPage />} />
        <Route path="/backup" element={<BackupPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Route>
    </Routes>
  );
}
