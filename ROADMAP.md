# Pusat Logam Mulia — Codex Roadmap
Repo: WSxenot/pusatlogammulia
Stack: Static HTML/CSS/JS — Cloudflare Pages — Google Sheets (price data)

## Completed
### Price Snapshot System
- [x] Cloudflare Worker deployed at plm-price-worker.pusatlogammulia.workers.dev
- [x] KV namespace PLM_PRICES bound to Worker
- [x] Cron trigger: */15 4-8 * * * (every 15 min, 11am-3:59pm WIB)
- [x] Prices locked to 11am WIB snapshot, no live Sheets fetch
- [x] Before 11:30am WIB: site shows cutoff message instead of prices
- [x] KV only updated when sellRaw values change
- [x] Frontend (js/gold-price.js) fetches from Worker URL

- [x] Favicon updated (transparent logo PNG)
- [x] Navbar logo added
- [x] Hero tagline "Pure gold, eternal value." added
- [x] Browser tab title updated
- [x] Social proof counter "10.000+ transaksi"
- [x] Trust strip: ANTAM + Galeri24 official logos
- [x] Instagram handle @8nagaemas wired in
- [x] Marketplace section: Tokopedia, Shopee, Blibli with store links
- [x] Price table connected to Google Sheets CSV
- [x] Price table switched to right table (IG dan WA) via lastIndexOf
- [x] Galeri24 section removed from price table
- [x] ANTAM column renamed to "Harga COD"
- [x] Mobile toggle: Jual/Cicil → Jual/COD; second column CICIL 2× → HARGA COD
- [x] Masked prices (2.8XX.000) display as raw text
- [x] Stop-render after 100g row (Pegadaian rows hidden, data preserved in Sheets)
- [x] Comparison section: 8-row table, PLM vs Toko Lain, mobile full-width row headers with gold left border
- [x] Scroll padding fix (navbar height offset)
- [x] Cloudflare Pages migration (domain stays at Canva/Tucows, nameservers point to Cloudflare)
- [x] Certificate verification section: ANTAM (CertiEye) + Galeri24 (G24 Gold)
  - SCAN overlay fixed via inline JS using naturalWidth/naturalHeight
  - Final values: Galeri24 (0.72, 0.80), ANTAM (0.31, 0.80)
  - SCAN label: rgba(0,0,0,0.55) backdrop, gold text, repositions on resize
  - To adjust: edit positionOverlay() values near </body> in index.html

## In Progress
- [ ] Hero video: reference images done (ChatGPT), video generation pending (Veo 3 + CapCut)
- [ ] Hero section: video background + overlay code (pending final video)

## Pending
- [ ] FAQ section (content not yet shared)
- [ ] Real shop photos
- [ ] Payment methods section
- [ ] Google Business Profile + Maps pin
- [ ] OG image (1200×630)

## Key Notes
- Data lives in Google Sheets, not the codebase — check Sheets first before debugging price display bugs
- Deployment: GitHub push → Cloudflare Pages (~60s delay) — hard refresh (Ctrl+Shift+R) to verify
- Codex prompts: keep scoped to one task, avoid over-explanation
- Local path: C:\Users\1817j\Downloads\Projects\pusatlogammulia
