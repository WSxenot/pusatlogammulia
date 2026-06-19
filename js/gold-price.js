// Price table from Cloudflare Worker snapshot
(function() {
  const PRICE_WORKER_URL = 'https://plm-price-worker.pusatlogammulia.workers.dev/';
  const PRICE_UNAVAILABLE_MESSAGE = 'Harga hari ini belum tersedia. Silakan kembali setelah jam 11.30 WIB.';

  function maskAfterFirst2(value) {
    const priceChars = String(value).toUpperCase().replace(/[^0-9X]/g, '');
    if (priceChars.length < 3) return '—';

    let visibleDigits = 0;
    const masked = [...priceChars].map(char => {
      if (/\d/.test(char) && visibleDigits < 2) {
        visibleDigits++;
        return char;
      }
      return 'X';
    }).join('');
    return masked.replace(/\B(?=(.{3})+(?!.))/g, '.');
  }

  function renderSell(value) {
    if (!value) return '—';
    return maskAfterFirst2(value);
  }

  function getDisplayBrand(brand) {
    if (brand === 'ANTAM') return 'Gold Catalogue';
    if (brand === 'SILVER') return 'Silver Catalogue';
    return brand;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[char]);
  }

  function showPriceTable() {
    const table = document.getElementById('price-table');
    const message = document.getElementById('price-unavailable-message');
    if (table) table.style.display = '';
    if (message) message.remove();
  }

  function showPriceUnavailableMessage() {
    const table = document.getElementById('price-table');
    const wrapper = table?.closest('.price-table-wrapper');
    if (!wrapper) return;

    table.style.display = 'none';
    let message = document.getElementById('price-unavailable-message');
    if (!message) {
      message = document.createElement('div');
      message.id = 'price-unavailable-message';
      message.setAttribute('role', 'status');
      Object.assign(message.style, {
        color: '#C9A84C',
        textAlign: 'center',
        fontFamily: 'inherit',
        lineHeight: '1.6',
        padding: '24px 16px'
      });
      wrapper.appendChild(message);
    }
    message.textContent = PRICE_UNAVAILABLE_MESSAGE;
  }

  function buildTable(rows, sourceDateText) {
    const tbody = document.getElementById('price-table-body');
    if (!tbody) return;

    showPriceTable();
    tbody.innerHTML = '';
    const groups = { ANTAM: [], SILVER: [] };

    if (sourceDateText) {
      const dateEl = document.getElementById('price-date-text');
      if (dateEl) dateEl.textContent = `Per ${sourceDateText}`;
    }

    rows.forEach(row => {
      const brand = row.brand;
      const displayProduct = row.displayProduct;
      if (!groups[brand] || !displayProduct) return;
      groups[brand].push({
        displayProduct,
        sellRaw: row.sellRaw || '',
        buyRaw: row.buyRaw || '',
        cicilRaw: row.cicilRaw || ''
      });
    });

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
          <td class="col-buy">${escapeHtml(buyRaw ? maskAfterFirst2(buyRaw) : '—')}</td>
          <td class="col-cicil">${escapeHtml(cicilRaw ? maskAfterFirst2(cicilRaw) : '—')}</td>
        `;
        tbody.appendChild(tr);
      });
    });
  }

  async function fetchPrices() {
    const tbody = document.getElementById('price-table-body');

    try {
      const response = await fetch(PRICE_WORKER_URL);
      const payload = await response.json();
      if (payload.ok === false || ['before_price_cutoff', 'snapshot_not_ready'].includes(payload.error)) {
        showPriceUnavailableMessage();
        return;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (!Array.isArray(payload.rows)) throw new Error('Invalid price snapshot');
      buildTable(payload.rows, payload.sourceDateText);
    } catch (err) {
      console.error('Price table fetch error:', err);
      if (tbody) {
        showPriceTable();
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
