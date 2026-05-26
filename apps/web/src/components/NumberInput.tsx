import { forwardRef, useEffect, useState, type ChangeEvent, type InputHTMLAttributes } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Numeric input that lets the user clear the field with backspace.
// - `value`: number | null (null when empty)
// - `onChange(value, raw)`: fires on every keystroke; value is null while empty
// - `integer`: if true, strips decimals and the decimal separator
// - `min` / `max`: clamped onBlur only — typing is never blocked mid-edit
export interface NumberInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  value: number | null;
  onChange: (value: number | null) => void;
  integer?: boolean;
  min?: number;
  max?: number;
  allowNegative?: boolean;
}

const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(function NumberInput(
  { value, onChange, integer = false, min, max, allowNegative = false, className, onBlur, ...rest },
  ref,
) {
  const [text, setText] = useState<string>(value == null ? "" : String(value));

  // Re-sync when parent value changes externally (form reset, etc.)
  useEffect(() => {
    const current = text === "" ? null : Number(text);
    if (value !== current && !(value == null && text === "")) {
      setText(value == null ? "" : String(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const sanitize = (s: string): string => {
    if (!s) return "";
    let out = s;
    out = out.replace(integer ? /[^\d-]/g : /[^\d.\-]/g, "");
    if (!allowNegative) out = out.replace(/-/g, "");
    else out = out.replace(/(?!^)-/g, ""); // only leading '-'
    if (!integer) {
      const dot = out.indexOf(".");
      if (dot !== -1) out = out.slice(0, dot + 1) + out.slice(dot + 1).replace(/\./g, "");
    }
    return out;
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const next = sanitize(e.target.value);
    setText(next);
    if (next === "" || next === "-" || next.endsWith(".")) {
      onChange(null);
      return;
    }
    const n = Number(next);
    if (Number.isFinite(n)) onChange(n);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (text !== "") {
      let n = Number(text);
      if (Number.isFinite(n)) {
        if (min != null && n < min) n = min;
        if (max != null && n > max) n = max;
        setText(String(n));
        onChange(n);
      }
    }
    onBlur?.(e);
  };

  return (
    <Input
      ref={ref}
      type="text"
      inputMode={integer ? "numeric" : "decimal"}
      pattern={integer ? "[0-9]*" : undefined}
      value={text}
      onChange={handleChange}
      onBlur={handleBlur}
      className={cn("tabular-nums", className)}
      {...rest}
    />
  );
});

export default NumberInput;
