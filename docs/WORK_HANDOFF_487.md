# Paste this small prompt into ChatGPT Work

Continue ATRIA 4.8.7 safely.

- Repo: \`javierdario48-star/ATRIA\`
- Source branch (read-only): \`atria-4.8.7-multiplayer-stabilization\`
- Prework/target branch: \`atria-4.8.7-structural-cleanup-qa\`
- Read **first**, in this order:
  1. \`docs/OTSERVER_ARCHITECTURE_BLUEPRINT_487.md\`
  2. \`docs/WORK_LOW_CREDIT_PLAYBOOK_487.md\`
  3. This handoff.
- These documents have already analyzed the reference architecture of OTServ/The Forgotten Server and inventoried known ATRIA ownership candidates. **Do not repeat the general research**.
- First verify GitHub heads. Reconcile any changes since source baseline \`95c4f5d7c3a02bfebc675be3889bcc673ac96e4a\` without overwriting any work.
- **Scope of first run: one checkpoint, nurse/study/medicine command path only.** Build a real causal trace, add negative regression tests, and fix only a demonstrated bug. No migration of the whole game, no map/movement changes, no replacement clinical engine. Preserve 4.8.6 frozen source.
- Run targeted tests, then browser CI and golden hash gate. Never relax assertions. Stop after one green commit or a documented blocker; do NOT automatically proceed to other modules.
- Return SHA, CI, concise root cause, files, and outstanding risks. Use the existing real multi-browser harness; physical Android remains a manual validation.

Your goal is the **smallest validated change** that improves reliability, not the maximum number of edited lines.
