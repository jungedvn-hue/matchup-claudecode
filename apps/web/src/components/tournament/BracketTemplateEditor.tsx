import { useMemo } from "react";
import { Shuffle, Sparkles, AlertTriangle, Check } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  generateCrossPoolTemplate,
  generateSnakeTemplate,
  validateTemplate,
  formatSlotRef,
  listPoolRankSlots,
  nearestBracketSize,
  poolLetter,
} from "@/lib/tournament/engine";
import type { BracketSlotRef, BracketTemplateMatch } from "@/lib/tournament/types";

type Props = {
  poolCount: number;
  advancingPerPool: number;
  wildcardCount: number;
  template: BracketTemplateMatch[] | undefined;
  onChange: (next: { template: BracketTemplateMatch[]; poolCount: number }) => void;
  onPoolCountChange: (n: number) => void;
};

// All slot options for a dropdown (1A, 1B, ..., W1, W2, BYE).
function buildSlotOptions(poolCount: number, advancingPerPool: number, wildcardCount: number): BracketSlotRef[] {
  const slots = listPoolRankSlots(poolCount, advancingPerPool);
  for (let i = 0; i < wildcardCount; i++) slots.push({ type: "wildcard", index: i + 1 });
  slots.push({ type: "bye" });
  return slots;
}

const slotKey = (s: BracketSlotRef) => formatSlotRef(s);

const parseSlot = (raw: string): BracketSlotRef => {
  if (raw === "BYE") return { type: "bye" };
  if (raw.startsWith("W")) return { type: "wildcard", index: Number(raw.slice(1)) };
  // e.g. "1A" → rank=1, pool=A
  const rank = Number(raw[0]);
  const poolIdx = raw.charCodeAt(1) - 65;
  return { type: "pool_rank", poolIndex: poolIdx, rank };
};

export default function BracketTemplateEditor({
  poolCount,
  advancingPerPool,
  wildcardCount,
  template,
  onChange,
  onPoolCountChange,
}: Props) {
  const { t } = useLanguage();

  const expectedMatches = nearestBracketSize(Math.max(2, poolCount * advancingPerPool + wildcardCount)) / 2;

  const current = useMemo<BracketTemplateMatch[]>(() => {
    if (template && template.length === expectedMatches) return template;
    return generateSnakeTemplate(poolCount, advancingPerPool, wildcardCount);
  }, [template, expectedMatches, poolCount, advancingPerPool, wildcardCount]);

  const validation = useMemo(
    () => validateTemplate(current, poolCount, advancingPerPool, wildcardCount),
    [current, poolCount, advancingPerPool, wildcardCount],
  );

  const slotOptions = useMemo(
    () => buildSlotOptions(poolCount, advancingPerPool, wildcardCount),
    [poolCount, advancingPerPool, wildcardCount],
  );

  const applyPreset = (preset: "cross" | "snake") => {
    const next = preset === "cross"
      ? generateCrossPoolTemplate(poolCount, advancingPerPool, wildcardCount)
      : generateSnakeTemplate(poolCount, advancingPerPool, wildcardCount);
    onChange({ template: next, poolCount });
  };

  const updateSlot = (matchIdx: number, side: "a" | "b", raw: string) => {
    const next = current.map((m, i) => (i === matchIdx ? { ...m, [side]: parseSlot(raw) } : m));
    onChange({ template: next, poolCount });
  };

  // Same-pool warning for each R1 match.
  const samePoolWarning = (m: BracketTemplateMatch): boolean => {
    if (m.a.type !== "pool_rank" || m.b.type !== "pool_rank") return false;
    return m.a.poolIndex === m.b.poolIndex;
  };

  return (
    <div className="space-y-3">
      {/* Pool count input */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-[11px] font-semibold text-foreground/80">{t("tm.tpl.poolCount")}</Label>
          <Input
            type="number"
            min={2}
            max={16}
            value={poolCount}
            onChange={(e) => onPoolCountChange(Math.max(2, Math.min(16, Number(e.target.value) || 2)))}
            className="h-9 text-sm"
          />
          <p className="text-[10px] text-muted-foreground leading-tight">{t("tm.tpl.poolCountHint")}</p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px] font-semibold text-foreground/80">{t("tm.tpl.bracketSize")}</Label>
          <div className="h-9 px-3 rounded-md border border-input bg-secondary/30 flex items-center text-sm tabular-nums">
            {expectedMatches * 2} ({expectedMatches} {t("tm.tpl.matches")})
          </div>
          <p className="text-[10px] text-muted-foreground leading-tight">{t("tm.tpl.bracketSizeHint")}</p>
        </div>
      </div>

      {/* Preset buttons */}
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="outline" className="flex-1 h-9 rounded-lg gap-1.5" onClick={() => applyPreset("cross")}>
          <Sparkles className="h-3.5 w-3.5" /> {t("tm.tpl.presetCross")}
        </Button>
        <Button type="button" size="sm" variant="outline" className="flex-1 h-9 rounded-lg gap-1.5" onClick={() => applyPreset("snake")}>
          <Shuffle className="h-3.5 w-3.5" /> {t("tm.tpl.presetSnake")}
        </Button>
      </div>

      {/* Pairing rows */}
      <div className="space-y-1.5">
        {current.map((m, i) => {
          const warn = samePoolWarning(m);
          return (
            <div key={i} className={`flex items-center gap-2 p-2 rounded-lg border ${warn ? "border-amber-500/40 bg-amber-500/5" : "border-border bg-secondary/20"}`}>
              <span className="text-[10px] font-bold text-muted-foreground w-10 tabular-nums shrink-0">M{i + 1}</span>
              <SlotPicker value={m.a} options={slotOptions} onChange={(v) => updateSlot(i, "a", v)} />
              <span className="text-[10px] text-muted-foreground shrink-0">vs</span>
              <SlotPicker value={m.b} options={slotOptions} onChange={(v) => updateSlot(i, "b", v)} />
              {warn && <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
            </div>
          );
        })}
      </div>

      {/* Validation banner */}
      {validation.ok ? (
        <div className="flex items-center gap-2 text-[11px] text-primary font-medium">
          <Check className="h-3.5 w-3.5" /> {t("tm.tpl.valid")}
        </div>
      ) : (
        <div className="flex items-start gap-2 text-[11px] text-destructive font-medium">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>{(validation as { reason: string }).reason}</span>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground italic">
        {t("tm.tpl.legend", { letters: Array.from({ length: poolCount }, (_, i) => poolLetter(i)).join(", ") })}
      </p>
    </div>
  );
}

function SlotPicker({ value, options, onChange }: {
  value: BracketSlotRef;
  options: BracketSlotRef[];
  onChange: (raw: string) => void;
}) {
  return (
    <select
      value={slotKey(value)}
      onChange={(e) => onChange(e.target.value)}
      className="flex-1 h-8 rounded-md border border-input bg-background px-2 text-xs font-bold tabular-nums min-w-0"
    >
      {options.map((opt) => (
        <option key={slotKey(opt)} value={slotKey(opt)}>{slotKey(opt)}</option>
      ))}
    </select>
  );
}
