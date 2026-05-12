// International gold spot price trend chart
(function() {
  let chartInstance = null;
  const DEFAULT_IDR_RATE = 16500;
  const GOLD_HISTORY_URL = 'https://api.gold-api.com/history/XAU/USD/30d';

  function waitForChartJS(callback, maxAttempts = 40, interval = 500) {
    let attempts = 0;
    const check = setInterval(() => {
      attempts++;
      if (typeof Chart !== 'undefined') {
        clearInterval(check);
        callback();
      } else if (attempts >= maxAttempts) {
        clearInterval(check);
        showStatus('Chart.js gagal dimuat');
      }
    }, interval);
  }

  function showStatus(msg) {
    const el = document.getElementById('chart-status');
    if (el) {
      el.textContent = msg;
      el.style.display = 'block';
    }
  }

  function hideStatus() {
    const el = document.getElementById('chart-status');
    if (el) el.style.display = 'none';
  }

  function formatIDR(val) {
    return 'Rp ' + Math.round(val).toLocaleString('id-ID');
  }

  function formatIDRShort(val) {
    if (val >= 1000000) return (val / 1000000).toFixed(1).replace('.', ',') + ' jt';
    if (val >= 1000) return (val / 1000).toFixed(0) + ' rb';
    return val.toString();
  }

  async function fetchWithTimeout(url, timeoutMs = 8000) {
    return Promise.race([
      fetch(url),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Fetch timeout: ${url}`)), timeoutMs);
      })
    ]);
  }

  async function getIDRRate() {
    const cached = Number(window.__idrRate);
    if (Number.isFinite(cached) && cached > 0) return cached;

    try {
      const res = await fetchWithTimeout('https://open.er-api.com/v6/latest/USD', 5000);
      const data = await res.json();
      const rate = Number(data.rates?.IDR);
      if (data.result === 'success' && Number.isFinite(rate) && rate > 0) {
        window.__idrRate = rate;
        return window.__idrRate;
      }
    } catch (e) {
      console.warn('IDR rate fetch failed, using fallback');
    }
    window.__idrRate = DEFAULT_IDR_RATE;
    return DEFAULT_IDR_RATE;
  }

  function parseResponse(text) {
    try {
      return JSON.parse(text);
    } catch (e) {
      return text;
    }
  }

  function extractRows(payload) {
    if (Array.isArray(payload)) return payload;
    if (!payload || typeof payload !== 'object') return [];
    if (payload.price || payload.close || payload.price_gram_24k) return [payload];

    for (const key of ['data', 'prices', 'history', 'results', 'items']) {
      const value = payload[key];
      if (Array.isArray(value)) return value;
      if (value && typeof value === 'object') {
        return Object.entries(value).map(([date, row]) =>
          row && typeof row === 'object' ? { date, ...row } : { date, price: row }
        );
      }
    }

    return Object.entries(payload)
      .filter(([, value]) => value && (typeof value === 'object' || Number.isFinite(Number(value))))
      .map(([date, row]) => row && typeof row === 'object' ? { date, ...row } : { date, price: row });
  }

  function normalizeDate(value) {
    if (!value) return null;
    const numeric = typeof value === 'number' || /^\d+$/.test(String(value)) ? Number(value) : null;
    const date = numeric ? new Date(numeric > 1e12 ? numeric : numeric * 1000) : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function normalizeHistory(payload) {
    return extractRows(payload)
      .map(row => {
        const date = normalizeDate(Array.isArray(row) ? row[0] : row.date || row.data || row.datetime || row.time || row.timestamp);
        const gram = Number(row.price_gram_24k || row.price_gram || row.gram_24k);
        const ounce = Number(Array.isArray(row) ? row[1] : row.price || row.close || row.value || row.ask || row.bid);
        const usdPerGram = Number.isFinite(gram) && gram > 0
          ? gram
          : Number.isFinite(ounce) && ounce > 0 ? ounce / 31.1035 : null;
        return date && usdPerGram ? { date, usdPerGram } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.date - b.date);
  }

  async function fetchGoldApiHistory() {
    const res = await fetchWithTimeout(GOLD_HISTORY_URL);
    const raw = parseResponse(await res.text());
    console.log('Gold API raw response:', raw);
    if (!res.ok) throw new Error(`Gold API HTTP ${res.status}`);
    const rows = normalizeHistory(raw);
    if (!rows.length) throw new Error('Gold API empty data');
    return rows;
  }

  async function fetchYahooHistory() {
    const res = await fetchWithTimeout('https://query2.finance.yahoo.com/v8/finance/chart/GC%3DF?range=1mo&interval=1d');
    if (!res.ok) throw new Error(`Yahoo HTTP ${res.status}`);
    const result = (await res.json())?.chart?.result?.[0];
    const timestamps = result?.timestamp || [];
    const closes = result?.indicators?.quote?.[0]?.close || [];
    const rows = timestamps
      .map((timestamp, i) => closes[i] ? { timestamp, price: closes[i] } : null)
      .filter(Boolean);
    const data = normalizeHistory(rows);
    if (!data.length) throw new Error('Yahoo empty data');
    return data;
  }

  async function fetchPaxgHistory() {
    const res = await fetchWithTimeout('https://api.coingecko.com/api/v3/coins/pax-gold/market_chart?vs_currency=usd&days=30&interval=daily', 10000);
    if (!res.ok) throw new Error(`PAXG HTTP ${res.status}`);
    const data = normalizeHistory(await res.json());
    if (!data.length) throw new Error('PAXG empty data');
    return data;
  }

  async function fetchHistory() {
    try {
      return await fetchGoldApiHistory();
    } catch (goldApiError) {
      try {
        return await fetchYahooHistory();
      } catch (yahooError) {
        try {
          console.warn('Primary chart history fetch failed, using PAXG fallback:', goldApiError, yahooError);
          return await fetchPaxgHistory();
        } catch (paxgError) {
          console.warn('Chart history fetch failed:', goldApiError, yahooError, paxgError);
        }
      }
      showStatus('Data grafik tidak tersedia saat ini');
      return null;
    }
  }

  function renderChart(data, period, idrRate) {
    const canvas = document.getElementById('price-chart');
    if (!canvas) return;

    const sliced = period === 7 ? data.slice(-7) : data;
    const labels = sliced.map(d => {
      return d.date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    });
    const values = sliced.map(d => d.usdPerGram * idrRate);

    if (chartInstance) chartInstance.destroy();

    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.parentElement.clientHeight);
    gradient.addColorStop(0, 'rgba(201, 168, 76, 0.25)');
    gradient.addColorStop(1, 'rgba(201, 168, 76, 0.0)');

    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Harga Emas Dunia (IDR/gram)',
          data: values,
          borderColor: '#C9A84C',
          backgroundColor: gradient,
          borderWidth: 2,
          fill: true,
          tension: 0.3,
          pointRadius: 3,
          pointBackgroundColor: '#C9A84C',
          pointBorderColor: '#0A0A0A',
          pointBorderWidth: 2,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: '#DFC06E',
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(20,20,20,0.95)',
            titleColor: '#A8A49E',
            bodyColor: '#F0EDE8',
            bodyFont: { size: 13, weight: '600' },
            borderColor: '#1E1E1E',
            borderWidth: 1,
            padding: 12,
            displayColors: false,
            callbacks: {
              label: ctx => formatIDR(ctx.parsed.y),
              afterLabel: () => '(harga spot internasional)'
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(30,30,30,0.8)', drawBorder: false },
            ticks: { color: '#6B6862', font: { size: 11 }, maxRotation: 0 },
            border: { display: false }
          },
          y: {
            grid: { color: 'rgba(30,30,30,0.8)', drawBorder: false },
            ticks: { color: '#6B6862', font: { size: 11 }, callback: v => formatIDRShort(v) },
            border: { display: false }
          }
        }
      }
    });
  }

  function setupToggle(data, idrRate) {
    document.querySelectorAll('.chart-toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.chart-toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderChart(data, parseInt(btn.dataset.period, 10), idrRate);
      });
    });
  }

  async function init() {
    showStatus('Memuat data grafik...');
    const [idrRate, data] = await Promise.all([getIDRRate(), fetchHistory()]);
    if (!data) return;
    hideStatus();
    renderChart(data, 7, idrRate);
    setupToggle(data, idrRate);
  }

  waitForChartJS(init);
})();
