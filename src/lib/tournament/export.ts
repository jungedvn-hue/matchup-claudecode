import { Tournament, TournamentCategory, Standing } from "./types";
import { calculateStandings, getWinnerId } from "./engine";

// ── CSV Export ──
export function exportStandingsCSV(
  tournament: Tournament,
  category: TournamentCategory,
  entryMap: Record<string, string>,
  t: (key: string) => string
): void {
  const rows: string[][] = [];

  category.pools.forEach((pool) => {
    const standings = calculateStandings(
      pool.matches,
      pool.entryIds,
      entryMap,
      category.advancingPerPool
    );

    rows.push([`${t("tm.pool")} ${pool.name}`]);
    rows.push([
      "#", t("tm.player"), t("tm.export.wins"), t("tm.export.losses"),
      t("tm.export.pointDiff"), t("tm.export.pointsScored"), t("tm.export.qualified"),
    ]);

    standings.forEach((s) => {
      rows.push([
        String(s.rank),
        s.entryName,
        String(s.wins),
        String(s.losses),
        String(s.pointDiff),
        String(s.pointsScored),
        s.qualified ? "✓" : "",
      ]);
    });

    rows.push([]);
  });

  // Match results
  rows.push([t("tm.export.matchResults")]);
  rows.push(["#", t("tm.pool"), t("tm.export.playerA"), t("tm.export.score"), t("tm.export.playerB"), t("tm.export.winner")]);

  category.pools.forEach((pool) => {
    pool.matches.forEach((m) => {
      rows.push([
        String(m.matchNo),
        pool.name,
        m.entryAName,
        `${m.scoreA}-${m.scoreB}`,
        m.entryBName,
        (() => {
          const wId = getWinnerId(m);
          return wId ? (entryMap[wId] || wId) : "";
        })(),
      ]);
    });
  });

  const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  downloadFile(csv, `${tournament.name}_${category.name}.csv`, "text/csv");
}

// ── PDF Export (Print-friendly HTML) ──
export function exportStandingsPDF(
  tournament: Tournament,
  category: TournamentCategory,
  entryMap: Record<string, string>,
  t: (key: string) => string
): void {
  const poolsHTML = category.pools
    .map((pool) => {
      const standings = calculateStandings(
        pool.matches,
        pool.entryIds,
        entryMap,
        category.advancingPerPool
      );

      const standingsRows = standings
        .map(
          (s) => `
        <tr style="${s.qualified ? "background:#e8f5e9;" : ""}">
          <td>${s.rank}${s.qualified ? " ✓" : ""}</td>
          <td><strong>${s.entryName}</strong></td>
          <td style="text-align:center;color:#2e7d32;font-weight:600">${s.wins}</td>
          <td style="text-align:center;color:#c62828">${s.losses}</td>
          <td style="text-align:center">${s.pointDiff > 0 ? "+" : ""}${s.pointDiff}</td>
          <td style="text-align:center;color:#666">${s.pointsScored}</td>
        </tr>`
        )
        .join("");

      const matchRows = pool.matches
        .map(
          (m) => `
        <tr>
          <td style="text-align:center">${m.matchNo}</td>
          <td style="text-align:right;${getWinnerId(m) === m.entryAId ? "font-weight:700;color:#2e7d32" : ""}">${m.entryAName}</td>
          <td style="text-align:center;font-weight:700">${m.scoreA} - ${m.scoreB}</td>
          <td style="${getWinnerId(m) === m.entryBId ? "font-weight:700;color:#2e7d32" : ""}">${m.entryBName}</td>
        </tr>`
        )
        .join("");

      return `
        <div style="margin-bottom:24px">
          <h3 style="margin:0 0 8px;color:#1a237e;border-bottom:2px solid #1a237e;padding-bottom:4px">
            ${t("tm.pool")} ${pool.name}
          </h3>
          <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:12px">
            <thead>
              <tr style="background:#f5f5f5">
                <th style="padding:6px;text-align:left;border-bottom:1px solid #ddd">#</th>
                <th style="padding:6px;text-align:left;border-bottom:1px solid #ddd">${t("tm.player")}</th>
                <th style="padding:6px;text-align:center;border-bottom:1px solid #ddd">W</th>
                <th style="padding:6px;text-align:center;border-bottom:1px solid #ddd">L</th>
                <th style="padding:6px;text-align:center;border-bottom:1px solid #ddd">+/-</th>
                <th style="padding:6px;text-align:center;border-bottom:1px solid #ddd">PF</th>
              </tr>
            </thead>
            <tbody>${standingsRows}</tbody>
          </table>
          <h4 style="margin:8px 0 4px;color:#555;font-size:11px">${t("tm.export.matchResults")}</h4>
          <table style="width:100%;border-collapse:collapse;font-size:11px">
            <tbody>${matchRows}</tbody>
          </table>
        </div>`;
    })
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${tournament.name} - ${category.name}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 24px; color: #222; max-width: 800px; margin: 0 auto; }
        h1 { font-size: 20px; margin: 0 0 4px; }
        h2 { font-size: 14px; color: #666; margin: 0 0 16px; font-weight: 400; }
        table td, table th { padding: 5px 8px; }
        tbody tr { border-bottom: 1px solid #eee; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <h1>🏓 ${tournament.name}</h1>
      <h2>${tournament.date} • ${tournament.location} • ${category.name}</h2>
      ${poolsHTML}
      <p style="font-size:10px;color:#999;margin-top:24px;text-align:center">
        Generated by PicklePlay Tour Manager
      </p>
    </body>
    </html>
  `;

  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  }
}

// ── Helpers ──
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob(["\uFEFF" + content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
