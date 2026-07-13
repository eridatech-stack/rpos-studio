Continue development of this existing RPOS Studio repository.

Read `AGENTS.md`, `docs/current-state.md`, `docs/architecture.md`, and `docs/roadmap.md` before making changes.

Then:

1. Inspect the repository and verify the documented state against the actual code.
2. Run `git status`, inspect `package.json`, inspect `prisma/schema.prisma`, and run the build/type-check.
3. Do not modify code until you report:
   - current build errors
   - discrepancies between docs and code
   - files needed for the next batch
4. Implement the next priority: Production Run Timeline UI using `production_run_events`.
5. Work in small batches and run the build/type-check after each batch.
6. Preserve the asynchronous keyword-driven production architecture.
7. Do not restore the obsolete article-based Start Production flow.
8. Use actual Prisma field and enum names from the schema.
9. Do not expose or commit secrets.
10. After the timeline works, propose the smallest safe batch for retrying failed production runs.
