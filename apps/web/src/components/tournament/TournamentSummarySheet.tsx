import { forwardRef } from "react";
import type { Tournament, TournamentCategory, BracketTemplateMatch, Pool } from "@/lib/tournament/types";
import { formatSlotRef, poolLetter } from "@/lib/tournament/engine";

type Props = { tournament: Tournament };

// A4 portrait at 96 DPI = 794 × 1123 px. We size the off-screen container to
// A4 width and let height grow with content — jsPDF auto-paginates.
const SHEET_WIDTH = 794;

const formatLabel: Record<string, string> = {
  round_robin: "Round Robin (vòng tròn)",
  knockout: "Knockout (loại trực tiếp)",
  hybrid: "Hybrid (vòng bảng + loại trực tiếp)",
};

const TournamentSummarySheet = forwardRef<HTMLDivElement, Props>(({ tournament }, ref) => {
  const t = tournament;
  const today = new Date().toLocaleDateString("vi-VN");
  const eventDate = t.date ? new Date(t.date).toLocaleDateString("vi-VN") : "—";

  return (
    <div
      ref={ref}
      style={{ width: SHEET_WIDTH, background: "#ffffff", color: "#0f172a", fontFamily: 'Inter, "Helvetica Neue", Arial, sans-serif' }}
      className="px-12 py-10 text-[14px] leading-relaxed"
    >
      {/* Header */}
      <header className="flex items-center gap-5 pb-6 border-b-4 border-[#16a34a]">
        {t.logoUrl ? (
          <img src={t.logoUrl} alt="" crossOrigin="anonymous" style={{ width: 84, height: 84, borderRadius: 16, objectFit: "cover" }} />
        ) : (
          <div style={{ width: 84, height: 84, borderRadius: 16, background: "#dcfce7", color: "#16a34a", fontSize: 32, fontWeight: 800 }} className="flex items-center justify-center">🏆</div>
        )}
        <div className="flex-1 min-w-0">
          <p style={{ fontSize: 11, letterSpacing: 2, color: "#16a34a", fontWeight: 700, textTransform: "uppercase" }}>Thể lệ giải đấu</p>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", lineHeight: 1.15, marginTop: 4 }}>{t.name || "Giải đấu"}</h1>
          <p style={{ fontSize: 13, color: "#64748b", marginTop: 6 }}>
            📅 {eventDate}{t.location ? ` · 📍 ${t.location}` : ""}
          </p>
        </div>
      </header>

      {/* Format */}
      <Section title="Thể thức">
        <KV label="Hình thức" value={formatLabel[t.format] || t.format} />
        <KV
          label="Tính điểm"
          value={`BO${t.numSets ?? 1} · ${t.pointsPerGame} điểm${t.winByTwo ? " · win-by-2" : ""}${t.maxPoints ? ` · cap ${t.maxPoints}` : ""}`}
        />
        <KV label="Thời lượng / trận" value={`${t.matchDuration} phút`} />
        <KV label="Số sân" value={`${t.courtsAvailable} sân`} />
        <KV label="Số đội / bảng" value={`${t.playersPerPool}`} />
      </Section>

      {/* Categories + per-category template + (optional) player list */}
      <Section title="Hạng mục">
        <div className="space-y-5">
          {t.categories.length === 0 && <p style={{ color: "#94a3b8" }}>Chưa có hạng mục.</p>}
          {t.categories.map((cat) => <CategoryBlock key={cat.id} category={cat} />)}
        </div>
      </Section>

      {/* Footer */}
      <footer style={{ marginTop: 36, paddingTop: 16, borderTop: "1px solid #e2e8f0", color: "#94a3b8", fontSize: 11 }}
        className="flex items-center justify-between">
        <span>matchup.asia</span>
        <span>Generated {today}</span>
      </footer>
    </div>
  );
});

TournamentSummarySheet.displayName = "TournamentSummarySheet";
export default TournamentSummarySheet;

// ── Helpers ────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 24 }}>
      <h2 style={{ fontSize: 11, letterSpacing: 2, color: "#16a34a", fontWeight: 800, textTransform: "uppercase", marginBottom: 12 }}>{title}</h2>
      {children}
    </section>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-3 py-1.5">
      <span style={{ fontSize: 12, color: "#64748b", width: 160, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 14, color: "#0f172a", fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function CategoryBlock({ category }: { category: TournamentCategory }) {
  const seedMode = category.bracketSeedMode || "auto";
  const wildcardLabel = category.wildcardCount === -1 ? "Best 3rd-place" : (category.wildcardCount > 0 ? `${category.wildcardCount}` : "BYE");

  return (
    <div style={{ padding: 18, borderRadius: 14, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
      <div className="flex items-center justify-between gap-4 mb-3">
        <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>{category.name}</h3>
        <div className="flex gap-2">
          <Pill text={`${category.advancingPerPool} lên/bảng`} />
          <Pill text={`Wildcard: ${wildcardLabel}`} />
        </div>
      </div>

      {category.pools && category.pools.length > 0 && (
        <PoolsList pools={category.pools} />
      )}

      {seedMode === "template" && category.bracketTemplate && category.bracketTemplate.length > 0 && (
        <KnockoutTemplate
          template={category.bracketTemplate}
          poolCount={category.bracketTemplatePoolCount ?? 4}
        />
      )}

      {seedMode === "auto" && (
        <p style={{ marginTop: 10, fontSize: 12, color: "#64748b", fontStyle: "italic" }}>
          Nhánh knockout: tự động xếp theo thứ hạng vòng bảng (chuẩn 1 vs N, 2 vs N-1, ...).
        </p>
      )}
    </div>
  );
}

function PoolsList({ pools }: { pools: Pool[] }) {
  if (pools.every((p) => !p.entryIds || p.entryIds.length === 0)) return null;
  return (
    <div style={{ marginTop: 8 }}>
      <p style={{ fontSize: 11, letterSpacing: 1.5, color: "#64748b", fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>Vòng bảng</p>
      <div className="grid grid-cols-2 gap-3">
        {pools.map((p) => (
          <div key={p.id} style={{ padding: 10, borderRadius: 10, background: "#ffffff", border: "1px solid #e2e8f0" }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#16a34a", marginBottom: 4 }}>Bảng {p.name}</p>
            <ol style={{ fontSize: 12, color: "#334155", paddingLeft: 18 }}>
              {p.entryIds.map((id, i) => (
                <li key={id} style={{ paddingTop: 2 }}>{getPoolEntryName(p, id, i)}</li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </div>
  );
}

function KnockoutTemplate({ template, poolCount }: { template: BracketTemplateMatch[]; poolCount: number }) {
  return (
    <div style={{ marginTop: 12 }}>
      <p style={{ fontSize: 11, letterSpacing: 1.5, color: "#64748b", fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>
        Nhánh knockout (R1)
      </p>
      <div className="grid grid-cols-2 gap-2">
        {template.map((m, i) => (
          <div key={i} style={{ padding: "8px 12px", borderRadius: 10, background: "#ffffff", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, width: 28 }}>M{i + 1}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", flex: 1 }}>{formatSlotRef(m.a)}</span>
            <span style={{ fontSize: 10, color: "#94a3b8" }}>vs</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", flex: 1, textAlign: "right" }}>{formatSlotRef(m.b)}</span>
          </div>
        ))}
      </div>
      <p style={{ marginTop: 8, fontSize: 11, color: "#94a3b8", fontStyle: "italic" }}>
        Ký hiệu: Bảng {Array.from({ length: poolCount }, (_, i) => poolLetter(i)).join(", ")} · 1A = nhất bảng A · W1 = wildcard 1 · BYE = ô trống
      </p>
    </div>
  );
}

function Pill({ text }: { text: string }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 999, background: "#dcfce7", color: "#15803d" }}>
      {text}
    </span>
  );
}

// Best-effort name lookup. When pools have not been allocated yet, ids may not
// exist in the category entry list, so we fall back to a placeholder.
function getPoolEntryName(pool: Pool, entryId: string, idx: number): string {
  const match = (pool.matches || []).find((m) => m.entryAId === entryId || m.entryBId === entryId);
  if (match) return match.entryAId === entryId ? match.entryAName : match.entryBName;
  return `${pool.name}${idx + 1}`;
}
