# Pusat Logam Mulia — Codex Roadmap
Repo: WSxenot/pusatlogammulia
Stack: Static HTML/CSS/JS — Cloudflare Pages — Google Sheets (price data)

## Completed
- [x] Price table connected to Google Sheets CSV
- [x] Galeri24 section removed from price table
- [x] ANTAM column renamed to "Harga COD"
- [x] Mobile toggle label: Jual/Cicil → Jual/COD
- [x] Stop-render after 100g row (Pegadaian rows hidden)
- [x] Price table switched to right table (IG dan WA) via lastIndexOf
- [x] Jual/COD second column header: CICIL 2× → HARGA COD
- [x] Masked prices (2.8XX.000) display as raw text
- [x] Comparison section: 8 categories, PLM vs Toko Lain
- [x] Comparison section converted to table layout

### Certificate Verification Section — SCAN Overlay (Done)
- Fixed SCAN bracket positioning for both ANTAM and Galeri24 cards
- Root cause: `object-fit: contain` letterboxing made CSS percentage positioning unreliable — percentages were relative to the container, not the actual displayed image
- Solution: replaced CSS custom property approach (`--qr-left`, `--qr-top`) with inline JS using natural image dimensions (`naturalWidth`, `naturalHeight`) to calculate exact pixel position at runtime
- Final JS values: Galeri24 `qrX: 0.72, qrY: 0.80` — ANTAM `qrX: 0.31, qrY: 0.80`
- SCAN label on both cards has dark backdrop `rgba(0,0,0,0.55)` with gold text for visibility on both dark and white backgrounds
- Overlay repositions correctly on window resize
- To adjust in future: edit the two numbers in `positionOverlay()` calls near `</body>` in `index.html`

## In Progress
- [ ] Hero video (AI-generated via Veo I2V — pending)
- [ ] Hero section code implementation (video background + overlay)

## Pending
- [x] Certificate verification section (CertiEye + G24 Gold)
- [ ] FAQ section
- [ ] Real shop photos
- [ ] Payment methods section
- [ ] Google Business Profile + Maps pin
- [ ] OG image (1200x630)
- [ ] Domain transfer (Canva → Cloudflare)

## Key Notes
- Data lives in Google Sheets, not the codebase
- Deployment: GitHub push → Cloudflare Pages (~60s delay)
- Hard refresh (Ctrl+Shift+R) to verify changes
- Local path: C:\Users\1817j\Downloads\Projects\pusatlogammulia
