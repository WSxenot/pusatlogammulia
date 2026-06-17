// Price table from Google Sheets CSV
(function() {
  const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQm3NbnQJ8v3C5FoXlUZeO2_n-Y7Jn11U1XRMKrSrKdW5wyHXMxeTvOPKLqYAFgdxj2Ri8kS_N3nhg4/pub?gid=625724274&single=true&output=csv';

  function formatIDR(value) {
    if (value.toString().includes('X')) return value.toString().trim();
    const num = parseInt(value.toString().replace(/[^0-9]/g, ''), 10);
    return isNaN(num) ? value : num.toLocaleString('id-ID');
  }

  function maskLast6(val) {
    const digits = String(val).replace(/\D/g, "");
    if (digits.length <= 6) return "—";
    const head = digits.slice(0, -6);
    const masked = head + "XXXXXX";
    return masked.replace(/\B(?=(.{3})+(?!.))/g, ".");
  }

  function renderSell(value) {
    if (!value) return '—';
    if (value.toString().includes('X')) return value.toString().trim();
    return maskLast6(value);
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

  function getProductBrand(productName) {
    const upper = productName.toUpperCase();
    if (upper.includes('GALERI24')) return 'GALERI24';
    if (upper.includes('SILVER')) return 'SILVER';
    if (upper.includes('ANTAM')) return 'ANTAM';
    return '';
  }

  function getDisplayBrand(brand) {
    if (brand === 'ANTAM') return 'Gold Catalogue';
    if (brand === 'SILVER') return 'Silver Catalogue';
    return brand;
  }

  function getDisplayProduct(productName) {
    const upper = productName.toUpperCase();
    if (upper.includes('GALERI24')) {
      if (upper.includes('BUYBACK')) return 'Buyback / Gram';
      const match = productName.match(/(\d+(?:[,.]\d+)?)\s*GRAM/i);
      return match ? `${match[1]} Gram - Promo` : '';
    }
    if (upper.includes('SILVER')) {
      const match = productName.match(/(\d+(?:[,.]\d+)?)\s*GRAM/i);
      return match ? `Silver ${match[1]} Gram` : '';
    }
    if (upper.includes('ANTAM')) {
      const match = productName.match(/(\d+(?:[,.]\d+)?)\s*GRAM/i);
      return match ? `${match[1]} Gram - Certieye` : '';
    }
    return productName;
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
    const headerIndex = rows.findIndex(row =>
      row.some(cell => clean(cell).toLowerCase().includes('kami jual')) &&
      row.some(cell => clean(cell).toLowerCase() === 'tampil')
    );
    const header = rows[headerIndex] || [];
    const findIndex = label => header.findIndex(cell => clean(cell).toLowerCase().includes(label));
    const sellIndex = header.reduce((lastIndex, cell, index) => clean(cell).toLowerCase().includes('kami jual') ? index : lastIndex, -1);
    const buyIndex = sellIndex >= 0 ? sellIndex + 1 : findIndex('kami beli');
    const cicilIndex = findIndex('cicil');
    const tampilIndex = header.findIndex(cell => clean(cell).toLowerCase() === 'tampil');

    return {
      startIndex: headerIndex >= 0 ? headerIndex + 1 : 2,
      productIndex: sellIndex > 0 ? sellIndex - 1 : 0,
      sellIndex: sellIndex >= 0 ? sellIndex : 1,
      buyIndex: buyIndex >= 0 ? buyIndex : 2,
      cicilIndex: cicilIndex >= 0 ? cicilIndex : (buyIndex >= 0 ? buyIndex : 2),
      tampilIndex: tampilIndex >= 0 ? tampilIndex : -1,
      dateText: findDateText(rows.slice(0, headerIndex >= 0 ? headerIndex : 2))
    };
  }

  function buildTable(rows) {
    const tbody = document.getElementById('price-table-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    const config = findColumnConfig(rows);
    const groups = { ANTAM: [], SILVER: [] };

    if (config.dateText) {
      const dateEl = document.getElementById('price-date-text');
      if (dateEl) dateEl.textContent = `Per ${config.dateText}`;
    }

    for (let i = config.startIndex; i < rows.length; i++) {
      const row = rows[i];
      if (!row?.[config.productIndex]?.trim()) continue;
      if (clean(row[config.tampilIndex]).toLowerCase() !== 'true') continue;

      const product = clean(row[config.productIndex]);
      const sellRaw = clean(row[config.sellIndex]);
      const buyRaw = clean(row[config.buyIndex]);
      const cicilRaw = clean(row[config.cicilIndex]);
      const brand = getProductBrand(product);
      const displayProduct = getDisplayProduct(product);

      if (!groups[brand] || !displayProduct) continue;
      groups[brand].push({ displayProduct, sellRaw, buyRaw, cicilRaw });
    }

    ['ANTAM', 'SILVER'].forEach(brand => {
      if (!groups[brand].length) return;

      const dividerRow = document.createElement('tr');
      dividerRow.className = `section-divider section-divider--${brand.toLowerCase()}`;
      dividerRow.innerHTML = `<td colspan="4">${getDisplayBrand(brand)}</td>`;
      tbody.appendChild(dividerRow);

      groups[brand].forEach(({ displayProduct, sellRaw, buyRaw, cicilRaw }) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="col-product">${escapeHtml(displayProduct)}</td>
          <td class="col-sell">${escapeHtml(renderSell(sellRaw))}</td>
          <td class="col-buy">${escapeHtml(buyRaw ? maskLast6(buyRaw) : '—')}</td>
          <td class="col-cicil">${escapeHtml(cicilRaw ? maskLast6(cicilRaw) : '—')}</td>
        `;
        tbody.appendChild(tr);
      });
    });
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
    refreshBtn.onclick = async () => {
      refreshBtn.classList.add('spinning');
      await fetchPrices();
      setTimeout(() => refreshBtn.classList.remove('spinning'), 800);
    };
  }

  const priceTable = document.getElementById('price-table');
  const priceToggleBtns = document.querySelectorAll('[data-price-view]');
  if (priceTable && priceToggleBtns.length) {
    const setPriceView = view => {
      priceTable.classList.toggle('show-installments', view === 'installments');
      priceToggleBtns.forEach(btn => {
        const isActive = btn.dataset.priceView === view;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
    };

    priceToggleBtns.forEach(btn => {
      btn.onclick = () => setPriceView(btn.dataset.priceView);
    });
    setPriceView('standard');
  }
})();
