# Fikstur Teklif Asistanı — Session Handoff

## Project

Windows desktop app (Tauri 2 + React + Mantine) for a manufacturing workshop to capture structured proposal data as JSON files on local disk. Phase 1 scope is **data entry only** — no AI, no CAD/CAM analysis. Turkish UI only.

- **Spec:** `docs/superpowers/specs/2026-04-13-phase1-desktop-app-design.md`
- **Plan:** `docs/superpowers/plans/2026-04-13-phase1-desktop-app.md` (21 tasks, Task 0–20)
- **Original long-form docs** (reference only, NOT the current scope): `docs/kullanici-plani.md`, `docs/teknik-plan.md` — these describe the full SaaS vision; Phase 1 is a subset.

## Current State

**Backend complete. Frontend not started.** 9/21 plan tasks done.

| Task | Status | Commit |
|---|---|---|
| 0: Scaffold Tauri + React | ✅ | `70017dd` |
| 1: AppError type | ✅ | `b9e272c` |
| 2: Data models | ✅ | `cb83250` |
| 3: Storage primitives (paths, atomic, slug) | ✅ | `944c878` |
| 4: Parameter storage + validation | ✅ | `adf0f2b` |
| 5: Customer storage | ✅ | `a9de09f` |
| 6: Proposal storage + filter + history + prefill | ✅ | `c60667a` |
| 7: Settings + backup storage | ✅ | `7413e3b` |
| 8: Commands + Tauri wiring | ✅ | `3e127ba` |
| 9: Frontend types + API client + i18n | ⏸ next | — |
| 10–20 | pending | — |

**Tests:** 22/22 passing (`cargo test` from `src-tauri/`). No frontend tests yet.

## Critical Environment Constraints

### 1. Rust toolchain is NOT on default PATH

Every bash command using `cargo` / `rustc` / `rustup` **must** prepend:
```bash
export PATH="/c/Users/Tolga/.cargo/bin:$PATH" && cargo test
```
Forgetting this causes `cargo: command not found`. Do not modify shell profiles to fix this.

### 2. Windows Smart App Control

Was blocking unsigned build-script binaries (os error 4551). **Now disabled** by the user — cargo builds work. If you ever see `Uygulama Denetimi ilkesi bu dosyayı engelledi` again, SAC has been re-enabled.

### 3. Git identity is NOT globally set

Every commit must use inline config override:
```bash
git -c user.email=dev@fikstur.local -c user.name="Fikstur Dev" commit -m "..."
```

### 4. Subagents can't run git commit

Dispatched subagents hit a sandbox deny on `git add` / `git commit`. **Current workflow:** subagents write code + run tests; the main session commits the changes afterward. Never delegate commit steps to a subagent — they'll report "permission denied" and leave the work uncommitted.

## Conventions

- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`, `test:`). One commit per task.
- **TDD:** Red → green → commit. Tests use `tempfile::tempdir()` (Rust) or `tempdir` equivalents.
- **Rust module visibility:** `pub` for crate boundary items, plain `fn` otherwise.
- **Rust style:** `cargo test` must pass with zero new warnings per task. One pre-existing warning exists: unused `ProposalStatus` import in `src-tauri/src/storage/proposals.rs`.
- **Paths in bash:** Forward slashes. `D:/Projects/fikstur_teklif_asistani/...`. No backslashes, no Windows `cmd` syntax — this is Git Bash.
- **Language:** UI is Turkish only. Code identifiers, comments, and commit messages are English. Turkish parameter values (labels, descriptions, enum values like `taslak`, `gonderildi`) ARE allowed in code where they represent user-facing enum values or fixture text.

## Project Layout

```
fikstur_teklif_asistani/
├── src-tauri/                    # Rust backend (COMPLETE)
│   ├── src/
│   │   ├── main.rs               # bootstrap → lib::run()
│   │   ├── lib.rs                # module registration + tauri::Builder
│   │   ├── error.rs              # AppError enum
│   │   ├── state.rs              # AppState with Mutex<DataPaths>
│   │   ├── models/               # Customer, Proposal, Parameter, Settings
│   │   ├── storage/              # paths, atomic, slug, customers, proposals, parameters, settings, backup
│   │   ├── validation/           # parameters::validate_custom_fields
│   │   └── commands/             # 24 #[tauri::command] fns (5 modules)
│   ├── Cargo.toml                # deps per spec §3
│   └── tauri.conf.json
├── src/                          # Frontend (TEMPLATE ONLY, needs Task 9+)
│   ├── main.tsx                  # still Tauri template boilerplate
│   └── App.tsx                   # still Tauri template boilerplate
├── package.json                  # all Mantine/react-hook-form/zod/dnd-kit deps installed
├── docs/                         # NEVER TOUCH unless asked
│   ├── kullanici-plani.md
│   ├── teknik-plan.md
│   └── superpowers/
│       ├── specs/2026-04-13-phase1-desktop-app-design.md
│       └── plans/2026-04-13-phase1-desktop-app.md
└── CLAUDE.md                     # this file
```

### What exists in `src/` right now

Only the default `create-tauri-app` template (`main.tsx` calls `invoke("greet", ...)`). The Tauri `greet` command was removed from `lib.rs` in Task 8, so the template will error at runtime if you `npm run tauri dev`. This is expected — Task 9 replaces `main.tsx` and related files.

## Data Model Quick Reference

**Data root:** `%APPDATA%\FiksturTeklifAsistani\data\` (Windows default) or user-chosen via `init_data_dir`.

```
data/
├── parameters.json         # global parameter catalog
├── settings.json           # app settings
├── customers/{slug}/
│   ├── customer.json
│   ├── proposals/{YYYY-MM-DD}-{NNN}-{slug}.json
│   └── attachments/        # empty, reserved for Phase 2
└── backups/*.zip
```

**Key invariant:** Every proposal stores a `parameter_snapshot` — the parameter catalog at write time. Deleting a parameter from the live catalog never breaks old proposals.

## Tauri Commands (24 total, registered in `lib.rs`)

- `list_customers`, `get_customer`, `create_customer`, `update_customer`, `delete_customer`
- `get_parameters`, `upsert_parameter`, `delete_parameter`, `reorder_parameters`
- `list_proposals`, `get_proposal`, `create_proposal`, `update_proposal`, `delete_proposal`, `get_field_history`, `get_prefill_values`
- `create_backup`, `list_backups`, `delete_backup`, `restore_backup`
- `get_settings`, `update_settings`, `init_data_dir`, `get_app_info`

All return `Result<T, AppError>`. `AppError` is `#[serde(tag = "kind")]` tagged with variants: `not_found`, `validation`, `conflict`, `io`, `corrupt`.

## Resuming Work

1. **Read:** `docs/superpowers/plans/2026-04-13-phase1-desktop-app.md`, starting at **Task 9: Frontend types and API client**.
2. **Execution model:** subagent-driven. Dispatch a fresh `general-purpose` agent per task using the implementer prompt template at `C:/Users/Tolga/.claude/plugins/cache/claude-plugins-official/superpowers/5.0.7/skills/subagent-driven-development/implementer-prompt.md`. Include the full task text from the plan in the prompt — do NOT make the subagent read the plan file.
3. **After every subagent finishes:** main session runs `git -c user.email=... -c user.name="..." commit -m "..."`. Don't delegate commits.
4. **Tests:** run `cargo test` (backend) or `npm test` (frontend — not yet scaffolded) after each task. Must be green before commit.

## Common Commands

```bash
# Run full Rust test suite
export PATH="/c/Users/Tolga/.cargo/bin:$PATH" && cd "D:/Projects/fikstur_teklif_asistani/src-tauri" && cargo test

# Frontend build check (does not open window)
cd "D:/Projects/fikstur_teklif_asistani" && npm run build

# Dev server (OPENS GUI — avoid during automated runs)
cd "D:/Projects/fikstur_teklif_asistani" && npm run tauri dev

# Git log
cd "D:/Projects/fikstur_teklif_asistani" && git log --oneline
```

## Plan Deviations So Far

1. **Cargo.lock committed** (Task 0) — plan didn't specify, kept.
2. **`@tauri-apps/plugin-opener`** (Task 0) — scaffolded by `create-tauri-app`, left in `package.json` unused (harmless). Rust side was replaced with `shell`/`dialog`/`fs`/`updater` plugins per spec.
3. **`create-tauri-app` flag bug** (Task 0) — CLI mis-parsed `--name`, created subfolder `--name/`. Subagent manually moved files up and renamed `__name_lib` → `fikstur_teklif_asistani_lib` throughout.
4. **`zip` crate type annotation** (Task 7) — plan specified `FileOptions<'_, ()>` but zip 0.6.6 has no generics; changed to bare `FileOptions`.
5. **`if let Ok(p): Result<Proposal, _>` type ascription** (Task 6) — invalid Rust syntax in plan; subagent replaced with a `match` block. Semantics identical.
6. **`list` function shadowed by local variable** (Task 6 test) — subagent renamed local to `listed`.

All deviations are documented in commit messages or subagent reports. None changed spec semantics.

## Do NOT

- Touch `docs/kullanici-plani.md` or `docs/teknik-plan.md` (user's living reference docs).
- Run `tauri dev` in automated / CI contexts (opens a GUI window, blocks).
- Re-enable Windows Smart App Control (can't be undone without Windows reinstall).
- Delegate git commits to subagents.
- Create new `.md` docs in the project root without being asked.
