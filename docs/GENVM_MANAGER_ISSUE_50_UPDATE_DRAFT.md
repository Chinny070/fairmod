# Draft comment for genlayerlabs/genvm-manager#50 — NOT YET POSTED, awaiting approval

## Update: root trigger isolated to source layout around the Depends magic comment

Following up with a resolution. We isolated the trigger to the **source-file layout immediately after the `# { "Depends": ... }` magic comment**, not the runner hash itself.

**Previous layout (failed, reproduced 3 times identically)**: the `Depends` line was immediately followed by a long block of additional `#`-comment lines (project documentation) before the first `import` statement.

**Corrected layout (succeeded)**: `Depends` line, one blank physical line, then imports directly — no intervening comment block.

### Successful probe

- Contract: minimal reproduction, one `gl.Contract` subclass, one deterministic view, no LLM/web/nondeterminism.
- Transaction: `0xa8d1b91da1af0e39e95cbe52d169f318d95985677664d368fd7d2e37cbc62bdb`
- Result: protocol `FINALIZED`, GenVM `execution_result: SUCCESS`, contract queryable (`schema`/`code` both succeed), `get_probe()` returns the expected value.

### Successful FairMod deployment

We then deployed our full application contract (unrelated to the probe, ~2,150 lines) with only the same header-layout fix applied — no other change to storage, methods, or logic.

- Transaction: `0x17343f3610fe94ffc22528b849a0326f27d94bec2d1544c1a2bb6c0b8f2def5f`
- Address: `0xB29187225636f6C43C5D9231Ab4f9cfc00907609`
- Result: protocol `FINALIZED`, GenVM `execution_result: SUCCESS`, schema/code both correct (30 methods).

We then exercised a full application lifecycle against this deployment — community creation, role-gated constitution authoring, case creation, real `gl.nondet.web.get` evidence acquisition (genuinely fetched `example.com`), real `gl.nondet.web.render(mode='screenshot')` + `gl.nondet.exec_prompt(images=[...])` visual evidence acquisition, real cross-validator semantic adjudication, a real application-level challenge and its independent resolution, and the Fairness Mirror — all reaching real consensus with `execution_result: SUCCESS`.

Same StudioNet 61999, same runner (`py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6`), same repository-local CLI (`genlayer` 0.39.1) throughout.

### Why we think this is worth flagging

- Previous failures were not runner-availability failures — the exact same runner hash deploys successfully with the corrected layout.
- Our local `genvm-linter==0.11.0` and schema validation accepted the *previous, failing* layout without any warning both before and after this fix — there is a discrepancy between what local tooling validates and what the hosted GenVM runner actually requires around the Depends-comment boundary.
- The hosted failure signature (`FINALIZED` + `Contract Error: invalid_contract`, no traceback, contract left unqueryable) gave no indication that a comment-layout issue was the cause — it looked identical to a runner-resolution failure.

### Questions

1. Is this layout restriction (no comment block between the `Depends` magic comment and the first import) intentional/documented somewhere we missed?
2. Should `genvm-linter`/schema validation reject this layout locally, so this class of failure is caught before a hosted deployment attempt?
3. Could the hosted error surface a more specific cause (e.g. "malformed/unparseable Depends header region") instead of the generic `invalid_contract`, to save others from re-deriving this the way we did?

Happy to share the full contract source or additional transaction detail if useful. Thanks for the runner-hash confirmation earlier — that pointed us in the right direction.
