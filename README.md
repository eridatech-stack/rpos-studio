# RPOS Codex Handoff Pack

Copy these files into the root of the `rpos-studio` repository:

- `AGENTS.md`
- `docs/current-state.md`
- `docs/architecture.md`
- `docs/roadmap.md`
- `docs/codex-start-prompt.md`

Then commit them and open the repository in Codex.

Use the content of `docs/codex-start-prompt.md` as the first Codex prompt.


Run steps:

#1: 
Remove-Item -Recurse -Force .next
 npm run dev

 #2:
  npm run worker:production

  #3:
  npm run worker:keyword-packs

  #4:
  npm run worker:social