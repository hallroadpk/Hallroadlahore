# Day Trader skill pack (vendored)

Eleven Claude Code skills for day trading, installed from
[`Jakeschincariol/day-trader-skill`](https://github.com/Jakeschincariol/day-trader-skill)
at commit `3d0f4ef6986f4984b7c6bd46f7ff4f87744c3abd` (v2.0.0, MIT).
Installed on 2026-10-26. License: see `LICENSE-day-trader.txt`.

These folders are the plain-skill install (not a plugin), so the commands are
`/trader-scanner`, `/trader-news`, …, with no namespace prefix. They are picked
up automatically by Claude Code when it runs in this repository. To install
them for all your projects instead, copy the same `trader-*` folders into
`~/.claude/skills/` on your machine.

## What's here

| skill | job |
| --- | --- |
| `trader-scanner` | scan thousands of charts for opening-range breakouts, flags, oversold bounces |
| `trader-news` | track headlines, 8-K filings and price moves for a watchlist |
| `trader-entry` | watch a setup bar by bar and time the entry |
| `trader-exit` | set stop and target before entering |
| `trader-timemachine` | Monte Carlo + historical replay of the trade |
| `trader-budget` | size the position to a max loss |
| `trader-risk` | PASS/BLOCK each order against your limits |
| `trader-broker` | show the order ticket; never places an order without your "yes" |
| `trader-alerts` | ring on stop, target, opening bell, price levels |
| `trader-analyst` | summarize SEC XBRL earnings facts |
| `trader-pelosi` | read public congressional trade disclosures |

Typical flow: `scanner -> news -> entry -> exit -> timemachine -> budget -> risk
-> broker`, with `alerts` while a trade is open.

## Requirements and data

Python 3.8+, standard library only — nothing to `pip install`. The tools read
free public endpoints (Yahoo Finance charts/headlines, Nasdaq Trader symbol
lists, SEC EDGAR, House Clerk). They write runtime state to a `trader/` folder
in the project root; that folder is gitignored so no watchlists, plans or
order tickets get committed.

For the SEC tools, set `SEC_USER_AGENT` (or `"sec_user_agent"` in
`trader/config.json`) to your name and email, as EDGAR requires.

An offline smoke test of the installed scanner:

```bash
python3 .claude/skills/trader-scanner/scan.py orb \
  --offline /path/to/wall5m-2026-10-19.json.gz \
  --now "2026-10-19 10:15" --min-price 0 --no-write
```

Fixtures and the full offline unittest suite (315 tests) live in the upstream
repo; they are not vendored here. To run them:

```bash
git clone https://github.com/Jakeschincariol/day-trader-skill.git
cd day-trader-skill && python3 -m unittest discover -s tests
```

## Safety notes

* **Not financial advice.** This is software that reads public data and does
  arithmetic. Most people who day trade lose money.
* Nothing places an order by itself. Only `trader-broker` can lead to an order,
  after `trader-risk` passes it and you explicitly confirm; paper trading is
  the default. Keep broker order tools on "Needs approval" in Claude's tool
  permissions — never "Always allow". Keep API keys in environment variables,
  never in chat or in this repository.
* The tools were reviewed before installing: all network calls are read-only
  GETs to the public endpoints above; there is no POST/upload, no shell-out
  except `pdftotext` for public PTR PDFs, no obfuscated code, and no hidden
  instructions in the skill files. Upstream has had no releases since the
  vendored commit, so re-audit before updating.
