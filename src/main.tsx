import React from "react";
import ReactDOM from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { ModalsProvider } from "@mantine/modals";
import {
  createBrowserRouter,
  createRoutesFromElements,
  Navigate,
  Route,
  RouterProvider,
} from "react-router-dom";
import App from "./App";
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
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/notifications/styles.css";

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<App />}>
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
    </Route>
  )
);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MantineProvider>
      <ModalsProvider>
        <Notifications position="top-right" />
        <RouterProvider router={router} />
      </ModalsProvider>
    </MantineProvider>
  </React.StrictMode>
);
