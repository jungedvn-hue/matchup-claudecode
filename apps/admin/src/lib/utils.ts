import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function maskPhone(p?: string | null) {
  if (!p) return "—";
  return p.length < 6 ? p : `${p.slice(0, 3)}***${p.slice(-2)}`;
}

export function maskEmail(e?: string | null) {
  if (!e) return "—";
  const [name, domain] = e.split("@");
  if (!domain) return e;
  return `${name.slice(0, 2)}***@${domain}`;
}
