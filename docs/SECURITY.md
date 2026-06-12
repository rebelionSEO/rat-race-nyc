# Security Posture

The strongest security feature of this game is what it doesn't have. Keep it that way.

## Current architecture = minimal attack surface

- **No server, no database, no accounts.** Static files running entirely in the player's
  browser. There is nothing to hack into and nothing to steal.
- **Zero dependencies.** No npm packages, no CDNs, no third-party scripts. Supply-chain
  attacks (the #1 way small web projects get compromised) are impossible because there
  is no supply chain.
- **No data collection.** No analytics, no cookies, no emails, no personal information.
  Nothing to leak, no privacy policy needed.

## Rules to preserve it (checked before every push)

1. **Never add a third-party script or CDN.** If a feature seems to need one, it needs
   a design discussion first.
2. **No secrets in this repo, ever.** No API keys, tokens, or local-machine paths.
   `.gitignore` blocks `.env` and `output/`. Commits are authored with a GitHub
   no-reply address, never a personal email or machine hostname.
3. **localStorage only stores game data** (unlocked levels, scores). When the save
   system lands (Phase 0): wrap reads in try/catch, validate types, never execute
   anything from storage. Corrupt or hand-edited saves should reset gracefully, not crash.
4. **No GitHub Actions workflows** unless genuinely needed. No CI = no CI to compromise.

## At public launch (GitHub Pages)

- Pages serves over **HTTPS** automatically — confirm the "Enforce HTTPS" box is checked.
- Add a Content-Security-Policy meta tag to `index.html` restricting scripts to this
  origin only — one line, blocks any injected script even in a worst case.

## Things that would change the picture (flag loudly if ever proposed)

- **Online leaderboards / multiplayer / accounts** — any of these means a server,
  real input validation, abuse handling, and ongoing cost. Treat as a separate project
  with its own security review, not a feature toggle.
- **Ads or analytics** — third-party code with access to the page. Recommend never.
