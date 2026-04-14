export type ParameterType =
  | "text" | "textarea" | "number"
  | "select" | "multiselect" | "boolean" | "date";

export interface Parameter {
  key: string;
  label: string;
  description: string;
  type: ParameterType;
  options: string[];
  unit: string | null;
  min: number | null;
  max: number | null;
  max_length: number | null;
  required: boolean;
  order: number;
}

export interface ParameterCatalog {
  schema_version: number;
  updated_at: string;
  parameters: Parameter[];
}

export interface Customer {
  id: string;
  schema_version: number;
  name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  tax_office: string;
  tax_no: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerInput {
  name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  tax_office: string;
  tax_no: string;
  notes: string;
}

export interface CustomerSummary {
  id: string;
  name: string;
  contact_person: string;
  phone: string;
  proposal_count: number;
  last_activity: string | null;
}

export type InteractionDirection = "incoming" | "outgoing" | "internal";

export type RowValueType = "text" | "textarea" | "number" | "price" | "file";

export interface CostItem {
  id: string;
  label: string;
  amount: number;
  currency: string;
  notes: string;
  updated_at: string;
}

export interface CostCatalog {
  schema_version: number;
  items: CostItem[];
  updated_at: string;
}

export interface InteractionRow {
  key: string;
  value: unknown;
  value_type: RowValueType;
}

export interface CostLine {
  cost_id: string;
  quantity: number;
}

export interface Interaction {
  id: string;
  direction: InteractionDirection;
  created_at: string;
  rows: InteractionRow[];
}

export interface Proposal {
  id: string;
  schema_version: number;
  customer_id: string;
  title: string;
  notes: string;
  created_at: string;
  updated_at: string;
  interactions: Interaction[];
  cost_lines: CostLine[];
}

export interface ProposalInput {
  customer_id: string;
  title: string;
  notes: string;
  interactions: Interaction[];
  cost_lines: CostLine[];
}

export interface ProposalSummary {
  id: string;
  customer_id: string;
  customer_name: string;
  title: string;
  created_at: string;
  updated_at: string;
  interaction_count: number;
}

export interface ProposalFilter {
  customer_id?: string | null;
  search?: string | null;
}

export interface Settings {
  schema_version: number;
  data_dir: string;
  default_currency: string;
  auto_update_enabled: boolean;
  skipped_version: string | null;
}

export interface SettingsInput {
  default_currency?: string;
  auto_update_enabled?: boolean;
  skipped_version?: string | null;
}

export interface AppInfo {
  version: string;
  data_dir: string;
  customer_count: number;
  proposal_count: number;
  parameter_count: number;
}

export interface BackupEntry {
  name: string;
  path: string;
  size_bytes: number;
  created_at: string;
}

export type RestoreMode = "merge" | "replace";

export type AppError =
  | { kind: "not_found"; entity: string; id: string }
  | { kind: "validation"; field: string; message: string }
  | { kind: "conflict"; message: string }
  | { kind: "io"; message: string }
  | { kind: "corrupt"; path: string; reason: string };
