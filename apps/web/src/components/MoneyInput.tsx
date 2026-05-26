import { forwardRef, useEffect, useState, type ChangeEvent, type InputHTMLAttributes } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Money input that shows thousand separators while typing.
// - `value`: number | null (null when empty)
// - `onChange(value)`: fires with the numeric value (separators stripped)
// - Uses "." as the thousand separator (vi-VN style).
// - Backspace clears digit-by-digit; empty field is allowed.
export interface MoneyInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  value: number | null;
  onChange: (value: number | null) => void;
  currency?: string; // optional suffix (e.g. "₫", "VND") — purely visual
  min?: number;
  max?: number;
}

const SEP = ".";

const formatGroups = (digits: string): string => {
  if (!digits) return "";
  // Insert SEP every 3 digits from the right.
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, SEP);
};

const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(function MoneyInput(
  { value, onChange, currency, min, max, className, onBlur, placeholder, ...rest },
  ref,
) {
  const [text, setText] = useState<string>(value == null ? "" : formatGroups(String(value)));

  useEffect(() => {
    const current = text.replace(/\D/g, "");
    const parsed = current === "" ? null : Number(current);
    if (value !== parsed) {
      setText(value == null ? "" : formatGroups(String(value)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "");
    const next = formatGroups(digits);
    setText(next);
    if (digits === "") {
      onChange(null);
      return;
    }
    const n = Number(digits);
    if (Number.isFinite(n)) onChange(n);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const digits = text.replace(/\D/g, "");
    if (digits !== "") {
      let n = Number(digits);
      if (Number.isFinite(n)) {
        if (min != null && n < min) n = min;
        if (max != null && n > max) n = max;
        setText(formatGroups(String(n)));
        onChange(n);
      }
    }
    onBlur?.(e);
  };

  return (
    <div className="relative">
      <Input
        ref={ref}
        type="text"
        inputMode="numeric"
        pattern="[0-9.]*"
        value={text}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={cn("tabular-nums", currency ? "pr-12" : "", className)}
        {...rest}
      />
      {currency && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground pointer-events-none">
          {currency}
        </span>
      )}
    </div>
  );
});

export default MoneyInput;
