# NewsBeat — social assets

These are generated from `apps/web/app/icon.svg`, the app's own mark. There was no
logo file to pull: the brand on the site is a text wordmark, and the only graphic is
that icon. So these are rendered from it rather than exported from a brand kit.

| File | Size | Use |
| --- | --- | --- |
| `newsbeat-mark-1024.png` | 1024×1024 | Profile picture. The glyph sits inside the circular-crop safe area, so it survives the round mask X, GitHub, LinkedIn and Discord apply. |
| `newsbeat-lockup-1024.png` | 1024×1024 | Mark above the wordmark. Square posts, press, anywhere the name must be read. |
| `newsbeat-og-1200x630.png` | 1200×630 | Open Graph and Twitter cards. The 1.91:1 size neither platform crops. |
| `newsbeat-square-1080.png` | 1080×1080 | Instagram and LinkedIn feed posts. |

Background is `#050505` with a subtle top-centre lift, matching the site. The mark is
`#e8ecff` on `#0a0f1e`; the connecting lines are `#7f8cff` at 50%.

## Regenerating

The source of truth is the SVG, not these PNGs. If the mark changes, re-render rather
than editing a bitmap. The render used headless Chrome at each exact size so there is
no resampling.

## Caveat

The deployed site still says **NewsGraph**. The NewsBeat rename exists on
`origin/docs/newsbeat-everyday-users`, and these assets follow that name — they will
not match production until the rename lands.
