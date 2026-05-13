// Price table from Google Sheets CSV
(function() {
  const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQm3NbnQJ8v3C5FoXlUZeO2_n-Y7Jn11U1XRMKrSrKdW5wyHXMxeTvOPKLqYAFgdxj2Ri8kS_N3nhg4/pub?gid=625724274&single=true&output=csv';

  function formatIDR(value) {
    const num = parseInt(value.toString().replace(/[^0-9]/g, ''), 10);
    return isNaN(num) ? value : num.toLocaleString('id-ID');
  }

  function parseCSV(text) {
    const rows = [];
    const lines = text.trim().split(/\r?\n/);
    for (const line of lines) {
      const cols = [];
      let inQuotes = false;
      let current = '';
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          cols.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      cols.push(current.trim());
      rows.push(cols);
    }
    return rows;
  }

  function isGaleri24Row(productName) {
    return productName && productName.toUpperCase().includes('GALERI24');
  }

  function clean(value) {
    return (value || '').replace(/['"]/g, '').trim();
  }

  function escapeHtml(value) {
    return value.replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[char]);
  }

  function isTextPrice(value) {
    return isNaN(parseInt(value, 10));
  }

  function renderPrice(value) {
    return value ? (isTextPrice(value) ? value : formatIDR(value)) : '—';
  }

  function findDateText(rows) {
    const datePattern = /^\d{1,2}[-/\s][A-Za-z]{3,}[-/\s]\d{4}$/;
    for (const row of rows) {
      const dateText = row.map(clean).find(value => datePattern.test(value));
      if (dateText) return dateText;
    }
    return '';
  }

  function findColumnConfig(rows) {
    const headerIndex = rows.findIndex(row => row.some(cell => clean(cell).toLowerCase().includes('kami jual')));
    const header = rows[headerIndex] || [];
    const findIndex = label => header.findIndex(cell => clean(cell).toLowerCase().includes(label));
    const sellIndex = findIndex('kami jual');
    const buyIndex = findIndex('kami beli');
    const cicilIndex = findIndex('cicil');

    return {
      startIndex: headerIndex >= 0 ? headerIndex + 1 : 2,
      productIndex: sellIndex > 0 ? sellIndex - 1 : 0,
      sellIndex: sellIndex >= 0 ? sellIndex : 1,
      buyIndex: buyIndex >= 0 ? buyIndex : 2,
      cicilIndex: cicilIndex >= 0 ? cicilIndex : 3,
      dateText: findDateText(rows.slice(0, headerIndex >= 0 ? headerIndex : 2))
    };
  }

  function buildTable(rows) {
    const tbody = document.getElementById('price-table-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    let galeri24Inserted = false;
    const config = findColumnConfig(rows);

    if (config.dateText) {
      const dateEl = document.getElementById('price-date-text');
      if (dateEl) dateEl.textContent = `Per ${config.dateText}`;
    }

    for (let i = config.startIndex; i < rows.length; i++) {
      const row = rows[i];
      if (!row?.[config.productIndex]?.trim()) continue;

      const product = clean(row[config.productIndex]);
      const sellRaw = clean(row[config.sellIndex]);
      const buyRaw = clean(row[config.buyIndex]);
      const cicilRaw = clean(row[config.cicilIndex]);

      if (isGaleri24Row(product) && !galeri24Inserted) {
        galeri24Inserted = true;
        const dividerRow = document.createElement('tr');
        dividerRow.className = 'section-divider';
        dividerRow.innerHTML = '<td colspan="4">Galeri24</td>';
        tbody.appendChild(dividerRow);
      }

      const noticeText = `${product} ${sellRaw} ${buyRaw} ${cicilRaw}`.toLowerCase();
      if (noticeText.includes('tanya') || (!sellRaw && product.toUpperCase().startsWith('LM ANTAM'))) {
        const specialRow = document.createElement('tr');
        specialRow.className = 'special-row';
        specialRow.innerHTML = `<td colspan="4">${escapeHtml(product)} — Tanya di Toko</td>`;
        tbody.appendChild(specialRow);
        continue;
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="col-product">${escapeHtml(product)}</td>
        <td class="col-sell">${escapeHtml(sellRaw ? formatIDR(sellRaw) : '—')}</td>
        <td class="col-buy">${escapeHtml(renderPrice(buyRaw))}</td>
        <td class="col-cicil">${escapeHtml(renderPrice(cicilRaw))}</td>
      `;
      tbody.appendChild(tr);
    }
  }

  async function fetchPrices() {
    const tbody = document.getElementById('price-table-body');
    if (!SHEET_CSV_URL || SHEET_CSV_URL === 'YOUR_GOOGLE_SHEET_CSV_URL_HERE') {
      if (tbody) {
        tbody.innerHTML = `
          <tr class="loading-row">
            <td colspan="4">Harga akan segera tersedia. Hubungi kami untuk harga terkini.</td>
          </tr>
        `;
      }
      return;
    }

    try {
      const response = await fetch(SHEET_CSV_URL);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      buildTable(parseCSV(await response.text()));
    } catch (err) {
      console.error('Price table fetch error:', err);
      if (tbody) {
        tbody.innerHTML = `
          <tr class="error-row">
            <td colspan="4">
              Gagal memuat data harga.
              <a href="https://wa.me/6281808118882" target="_blank" style="color:var(--accent)">
                Hubungi kami untuk harga terkini.
              </a>
            </td>
          </tr>
        `;
      }
    }
  }

  fetchPrices();
  window.__idrRate = null;

  const refreshBtn = document.getElementById('price-refresh');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      refreshBtn.classList.add('spinning');
      await fetchPrices();
      setTimeout(() => refreshBtn.classList.remove('spinning'), 800);
    });
  }
})();
