import { invoke } from "@tauri-apps/api/core";
import type {
  AppInfo, BackupEntry, CostCatalog, CostItem, Customer, CustomerInput,
  CustomerSummary, Parameter, ParameterCatalog, Proposal,
  ProposalFilter, ProposalInput, ProposalSummary, RestoreMode,
  Settings, SettingsInput,
} from "../types";

const call = <T>(cmd: string, args?: Record<string, unknown>) =>
  invoke<T>(cmd, args);

export const api = {
  listCustomers: () => call<CustomerSummary[]>("list_customers"),
  getCustomer: (id: string) => call<Customer>("get_customer", { id }),
  createCustomer: (input: CustomerInput) => call<Customer>("create_customer", { input }),
  updateCustomer: (id: string, input: CustomerInput) =>
    call<Customer>("update_customer", { id, input }),
  deleteCustomer: (id: string) => call<void>("delete_customer", { id }),

  getParameters: () => call<ParameterCatalog>("get_parameters"),
  upsertParameter: (param: Parameter) =>
    call<ParameterCatalog>("upsert_parameter", { param }),
  deleteParameter: (key: string) =>
    call<ParameterCatalog>("delete_parameter", { key }),
  reorderParameters: (keys: string[]) =>
    call<ParameterCatalog>("reorder_parameters", { keys }),
  ensureParameter: (key: string) =>
    call<ParameterCatalog>("ensure_parameter", { key }),

  getCosts: () => call<CostCatalog>("get_costs"),
  saveCosts: (items: CostItem[]) =>
    call<CostCatalog>("save_costs", { items }),

  listProposals: (filter: ProposalFilter) =>
    call<ProposalSummary[]>("list_proposals", { filter }),
  getProposal: (id: string) => call<Proposal>("get_proposal", { id }),
  createProposal: (input: ProposalInput) =>
    call<Proposal>("create_proposal", { input }),
  updateProposal: (id: string, input: ProposalInput) =>
    call<Proposal>("update_proposal", { id, input }),
  deleteProposal: (id: string) => call<void>("delete_proposal", { id }),
  uploadAttachment: (proposalId: string, interactionId: string, sourcePath: string) =>
    call<string>("upload_attachment", {
      proposalId, interactionId, sourcePath,
    }),
  openAttachment: (relPath: string) =>
    call<void>("open_attachment", { relPath }),

  createBackup: () => call<BackupEntry>("create_backup"),
  listBackups: () => call<BackupEntry[]>("list_backups"),
  deleteBackup: (name: string) => call<void>("delete_backup", { name }),
  restoreBackup: (path: string, mode: RestoreMode) =>
    call<void>("restore_backup", { path, mode }),

  getSettings: () => call<Settings>("get_settings"),
  updateSettings: (input: SettingsInput) =>
    call<Settings>("update_settings", { input }),
  initDataDir: (path: string) => call<Settings>("init_data_dir", { path }),
  getAppInfo: () => call<AppInfo>("get_app_info"),
};
