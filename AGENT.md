# AGENT.md

This project follows a **hexagonal architecture**. Future changes must preserve strict boundaries between:

- `src/domain` → pure domain logic
- `src/app` → use cases / orchestration
- `src/infra` → adapters to external systems (Obsidian APIs, persistence, iframe embedder)
- `src/ui` → presentation and user interaction only

Treat these boundaries as non-negotiable.

## 1) Architecture contract (must follow)

### Domain (`src/domain`)
**Purpose:** core business logic and pure transformations.

**Allowed:**
- Deterministic logic (e.g. similarity math, reconciliation, ignore-path rules, hashing, normalization).
- Reusable utilities that express domain behavior.

**Not allowed:**
- Obsidian API access.
- Storage reads/writes.
- UI concerns (`Notice`, modal/view rendering, DOM manipulation for UI workflows).
- Wiring or service construction.

> Rule: If logic can be unit-tested with plain inputs/outputs and no framework objects, it belongs here.

### Application/use cases (`src/app`)
**Purpose:** orchestrate domain + ports to perform user-visible actions.

**Allowed:**
- Dependency-injected factories (`makeX`) and use case composition.
- Coordinating repositories/providers/ports.
- Sequencing operations and progress callbacks.

**Not allowed:**
- Direct infrastructure details (no direct plugin data shape manipulation outside repos/stores).
- Heavy view rendering logic.
- Duplicating domain algorithms that already exist in `src/domain`.

> Rule: `app` answers **“what workflow happens”**, not **“how Obsidian/iframe/storage works internally.”**

### Infrastructure (`src/infra`)
**Purpose:** implement ports against concrete technologies.

**Allowed:**
- Obsidian adapters (`NoteSource`, `StatusReporter`, settings/data store).
- Index repository persistence mechanics.
- Embedding transport implementation (iframe messenger/provider).

**Not allowed:**
- Embedding scoring rules, set reconciliation rules, ignore matching rules, or other business decisions that should live in `domain`.
- UI-specific rendering decisions.

> Rule: `infra` translates interfaces to implementations. Keep policy out, keep mechanics in.

### UI (`src/ui`)
**Purpose:** render views/modals and map user interactions to use cases.

**Allowed:**
- View state, event handlers, empty/loading/error states.
- Calling use cases from `src/app`.
- Basic presentation formatting.

**Not allowed:**
- Reimplementing indexing/search/sync business logic.
- Accessing persistence internals directly.

> Rule: UI should orchestrate user intent, not own business rules.

---

## 2) Existing project patterns to keep

1. **Ports in `src/ports`** define boundaries (`EmbeddingPort`, `IndexRepository`, `NoteSource`, `SettingsRepository`, etc.). Shared data shapes remain in `src/types.ts`.
2. **Use case factories** (`makeIndexNote`, `makeGetSimilarNotes`, etc.) are the primary composition style.
3. **Single application container / composition root** is `AppContainer` in `src/app/appContainer.ts`, where concrete infra adapters are owned and wired to app use cases. Treat it as a container, not a normal application use case or `makeX` factory.
4. **Domain functions are reused by app** (`deriveSyncActions`, `isPathIgnored`, `normalizeEmbedding`, etc.), not rewritten in adapters.
5. **UI depends on use-case interfaces** (`GetSimilarNotesUseCase`, `SyncIndexToVaultUseCase`, etc.), not infra classes.

Any new feature should extend these same patterns first, rather than introducing shortcuts.

---

## 3) Placement decision checklist (run this before coding)

For every new logic block, decide location explicitly:

1. **Is it a pure rule/algorithm/transformation?** → `src/domain`.
2. **Is it a workflow combining ports + domain?** → `src/app`.
3. **Is it technology-specific I/O (Obsidian, iframe, storage)?** → `src/infra`.
4. **Is it rendering / interaction glue?** → `src/ui`.

If uncertain, prefer extracting pure logic into `domain` and keep other layers thin.

---

## 4) Change policy for future agents

- Do not bypass use cases by calling infra directly from UI when a use case should exist.
- Do not add Obsidian or DOM dependencies to `domain`.
- Do not place business decisions in infra adapters.
- Do not duplicate logic across layers; extract once, reuse through interfaces.
- Keep constructor/factory injection style consistent with current `makeX` patterns.
- Update/add port interfaces in `src/types.ts` when introducing new cross-layer contracts.

---

## 5) Preferred implementation flow for new features

1. Add/update **domain rule(s)** first (if business logic changes).
2. Add/update **port contracts** in `src/ports` if needed.
3. Implement/extend **app use case** (`makeX`) to orchestrate behavior.
4. Implement/extend **infra adapters** to satisfy contracts.
5. Connect everything in **`AppContainer`** (`src/app/appContainer.ts`).
6. Invoke through **UI** components.

This order keeps the core model clean and prevents architecture drift.

---

## 6) Quality gates (required)

Before finalizing a task, verify:

- [ ] No layer boundary violations.
- [ ] New business logic lives in `domain` (or is clearly justified otherwise).
- [ ] UI changes only call use cases/ports, not persistence internals.
- [ ] Composition is centralized in `AppContainer` (`src/app/appContainer.ts`).
- [ ] Build passes (`npm run build`).

If a quick fix conflicts with this architecture, **do not shortcut**. Implement the proper layered change.
