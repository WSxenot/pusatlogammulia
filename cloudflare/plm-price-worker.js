const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQm3NbnQJ8v3C5FoXlUZeO2_n-Y7Jn11U1XRMKrSrKdW5wyHXMxeTvOPKLqYAFgdxj2Ri8kS_N3nhg4/pub?gid=625724274&single=true&output=csv";
const SNAPSHOT_KEY = "latest";
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
    if (request.method !== "GET") return json({ ok: false, error: "method_not_allowed" }, 405);

    const now = new Date();
    const wibHour = (now.getUTCHours() + 7) % 24;
    const wibMinute = now.getUTCMinutes();
    const beforeCutoff = wibHour < 11 || (wibHour === 11 && wibMinute < 30);
    if (beforeCutoff) return json({ ok: false, error: "before_price_cutoff" });

    try {
      const snapshot = await env.PLM_PRICES.get(SNAPSHOT_KEY, "json");
      return snapshot
        ? json(snapshot, 200, { "Cache-Control": "public, max-age=300" })
        : json({ ok: false, error: "snapshot_not_ready" }, 404, { "Cache-Control": "no-store" });
    } catch (error) {
      console.error(JSON.stringify({ event: "snapshot_read_failed", error: error.message }));
      return json({ ok: false, error: "snapshot_read_failed" }, 500, { "Cache-Control": "no-store" });
    }
  },

  async scheduled(controller, env) {
    const snapshot = await buildSnapshot(controller.cron);
    await env.PLM_PRICES.put(SNAPSHOT_KEY, JSON.stringify(snapshot));
    console.log(JSON.stringify({
      event: "snapshot_written",
      capturedAt: snapshot.capturedAt,
      rowCount: snapshot.rows.length,
    }));
  },
};

async function buildSnapshot(cron) {
  const response = await fetch(SHEET_CSV_URL, { headers: { "Accept": "text/csv,*/*" } });
  if (!response.ok) throw new Error(`sheet_fetch_failed_${response.status}`);

  const rows = parseCSV(await response.text());
  const config = findColumnConfig(rows);
  const capturedAt = new Date();
  const snapshotRows = rows.slice(config.startIndex)
    .filter(row => clean(row[config.productIndex]))
    .filter(row => clean(row[config.tampilIndex]).toLowerCase() === "true")
    .map(row => {
      const rawProduct = clean(row[config.productIndex]);
      const brand = getProductBrand(rawProduct);
      return {
        brand,
        rawProduct,
        displayProduct: getDisplayProduct(rawProduct),
        sellRaw: clean(row[config.sellIndex]),
        buyRaw: clean(row[config.buyIndex]),
        cicilRaw: clean(row[config.cicilIndex]),
      };
    })
    .filter(row => ["ANTAM", "SILVER"].includes(row.brand) && row.displayProduct);

  if (!snapshotRows.length) throw new Error("snapshot_has_no_display_rows");

  return {
    ok: true,
    source: "google_sheets_csv",
    sourceDateText: config.dateText,
    capturedAt: capturedAt.toISOString(),
    capturedAtWib: toWibIso(capturedAt),
    cron,
    rows: snapshotRows,
  };
}

function parseCSV(text) {
  const rows = [];
  const lines = text.trim().split(/\r?\n/);
  for (const line of lines) {
    const cols = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === "\"") {
        if (inQuotes && line[i + 1] === "\"") {
          current += "\"";
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        cols.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }

    cols.push(current.trim());
    rows.push(cols);
  }
  return rows;
}

function findColumnConfig(rows) {
  const headerIndex = rows.findIndex(row =>
    row.some(cell => clean(cell).toLowerCase().includes("kami jual")) &&
    row.some(cell => clean(cell).toLowerCase() === "tampil")
  );
  if (headerIndex < 0) throw new Error("sheet_header_not_found");

  const header = rows[headerIndex] || [];
  const findIndex = label => header.findIndex(cell => clean(cell).toLowerCase().includes(label));
  const sellIndex = header.reduce((lastIndex, cell, index) =>
    clean(cell).toLowerCase().includes("kami jual") ? index : lastIndex, -1);
  const buyIndex = sellIndex >= 0 ? sellIndex + 1 : findIndex("kami beli");
  const cicilIndex = findIndex("cicil") >= 0 ? findIndex("cicil") : buyIndex;
  const tampilIndex = header.findIndex(cell => clean(cell).toLowerCase() === "tampil");

  if ([sellIndex, buyIndex, cicilIndex, tampilIndex, sellIndex - 1].some(index => index < 0)) {
    throw new Error("required_sheet_column_missing");
  }

  return {
    startIndex: headerIndex + 1,
    productIndex: sellIndex - 1,
    sellIndex,
    buyIndex,
    cicilIndex,
    tampilIndex,
    dateText: findDateText(rows.slice(0, headerIndex)),
  };
}

function findDateText(rows) {
  const datePattern = /^\d{1,2}[-/\s][A-Za-z]{3,}[-/\s]\d{4}$/;
  for (const row of rows) {
    const dateText = row.map(clean).find(value => datePattern.test(value));
    if (dateText) return dateText;
  }
  return "";
}

function getProductBrand(productName) {
  const upper = productName.toUpperCase();
  if (upper.includes("GALERI24")) return "GALERI24";
  if (upper.includes("SILVER")) return "SILVER";
  if (upper.includes("ANTAM")) return "ANTAM";
  return "";
}

function getDisplayProduct(productName) {
  const upper = productName.toUpperCase();
  if (upper.includes("GALERI24")) {
    if (upper.includes("BUYBACK")) return "Buyback / Gram";
    const match = productName.match(/(\d+(?:[,.]\d+)?)\s*GRAM/i);
    return match ? `${match[1]} Gram - Promo` : "";
  }
  if (upper.includes("SILVER")) {
    const match = productName.match(/(\d+(?:[,.]\d+)?)\s*GRAM/i);
    return match ? `Silver ${match[1]} Gram` : "";
  }
  if (upper.includes("ANTAM")) {
    const match = productName.match(/(\d+(?:[,.]\d+)?)\s*GRAM/i);
    return match ? `${match[1]} Gram - Certieye` : "";
  }
  return productName;
}

function clean(value) {
  return (value || "").replace(/['"]/g, "").trim();
}

function toWibIso(date) {
  return new Date(date.getTime() + 7 * 60 * 60 * 1000).toISOString().replace("Z", "+07:00");
}

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      ...headers,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
