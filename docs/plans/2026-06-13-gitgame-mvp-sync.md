# GitGame MVP Experience And Sync Implementation Plan

> **For Codex:** Use the local lightweight execution path. Do not run build for this repo; run focused tests only.

**Goal:** Improve the current Git learning game according to `GAME_DESIGN.md` and add the first frontend-facing backend sync contract from `BACKEND_SERVICE_SPEC.md`.

**Architecture:** Keep command validation and instant feedback in the frontend. Extract command evaluation into pure game logic, enrich challenge metadata for UI learning context, and add an optional API client that syncs completed challenge attempts only when `VITE_API_BASE_URL` is configured.

**Tech Stack:** React 19, Vite, TypeScript, Vitest, localStorage, optional REST JSON API.

---

### Task 1: Enrich Challenge Data

**Files:**
- Modify: `src/game/challenges.ts`
- Modify: `src/game/types.ts`

Steps:
1. Add stable skill, concept, repository state, and layered hint fields for each current challenge.
2. Keep existing `commands` as the canonical answer path.
3. Ensure data stays serializable and frontend-only.

### Task 2: Extract Command Evaluation

**Files:**
- Create: `src/game/commandEngine.ts`
- Create: `src/game/commandEngine.test.ts`
- Modify: `src/game/types.ts`

Steps:
1. Move command normalization and accepted/out-of-order/duplicate/invalid logic into pure functions.
2. Return educational feedback that explains why the state did or did not move forward.
3. Add tests for correct command, out-of-order command, duplicate command, invalid command, and layered hints.
4. Run `pnpm test -- src/game/commandEngine.test.ts`.

### Task 3: Add Optional Backend Sync Contract

**Files:**
- Create: `src/game/cloudSync.ts`
- Create: `src/game/cloudSync.test.ts`
- Modify: `src/game/types.ts`

Steps:
1. Implement a small client for `POST /api/player/challenge-attempts`.
2. Disable network calls when `VITE_API_BASE_URL` is absent.
3. Return explicit statuses: disabled, synced, failed.
4. Add tests with mocked `fetch`.

### Task 4: Update UI

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

Steps:
1. Show challenge skill, concept, and repository state in the play page.
2. Upgrade hints from one generic button to layered hint buttons.
3. Use extracted command evaluation in submit flow.
4. Show learned concept, XP breakdown, best-score update, and cloud sync status in the result modal.
5. Keep layouts responsive and all controls keyboard accessible.

### Task 5: Verification And Commit

Steps:
1. Run focused game tests with `pnpm test -- src/game`.
2. Do not run `pnpm build`.
3. Commit with Chinese message after verification.
