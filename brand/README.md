# NewsBeat brand

NewsBeat is building **meaningful signals for AI agents**. Source-linked news is the foundation; deeper interpretation is the next product stage. Stocks and crypto are coverage areas.

- Website: https://www.newsbeat.dev
- Main line: **Meaningful signals. Built for agents.**
- Product description: **An intelligence layer that helps agents understand what changed, why it may matter, and what to investigate next.**
- Contact: contact@newsbeat.dev

## Mark and palette

The NewsBeat mark is three rounded white bars on a black rounded tile. The middle bar is tallest. Use `apps/web/app/icon.svg` as the graphic source and `apps/web/components/site/brand-mark.tsx` in the website.

The palette is black, white and grey. Use the site's theme variables so the interface remains legible in dark and light modes.

## Assets

| File | Size | Purpose |
| --- | --- | --- |
| `newsbeat-mark-1024.png` | 1024 × 1024 | Profile mark |
| `newsbeat-lockup-1024.png` | 1024 × 1024 | Mark and wordmark |
| `newsbeat-og-1200x630.png` | 1200 × 630 | Static social asset |
| `newsbeat-square-1080.png` | 1080 × 1080 | Square social post |

The website generates its current social preview in `apps/web/app/(site)/opengraph-image.tsx`; it is the source of truth for link previews. Static exports should be checked against the current mark and copy before use.

## Voice

Lead with agent intelligence: meaningful developments, relevant context, evidence and uncertainty. Use “stocks and crypto” to describe coverage. Distinguish the live news foundation from planned interpretation; a summary or a market statistic is not automatically a meaningful signal. Describe tokenized-asset mapping as planned until verified mappings are available. Keep sources, timestamps and coverage freshness visible.
