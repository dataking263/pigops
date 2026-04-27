// Number / date formatting helpers

export const fmtNum = (n: number, opts: Intl.NumberFormatOptions = {}) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0, ...opts }).format(n);

export const fmtKg = (kg: number) => `${fmtNum(kg)} kg`;

export const fmtUSD = (usd: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(usd);

export const fmtZWL = (zwl: number) =>
  `ZWL ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(zwl)}`;

export const fmtUsdZwl = (usd: number, rate: number) =>
  `${fmtUSD(usd)} · ${fmtZWL(usd * rate)}`;

export const fmtRelative = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

export const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const fmtDateShort = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

export const ageWeeks = (birthIso: string | null | undefined) => {
  if (!birthIso) return null;
  const ms = Date.now() - new Date(birthIso).getTime();
  return Math.floor(ms / (7 * 86400000));
};

export const ageDays = (birthIso: string | null | undefined) => {
  if (!birthIso) return null;
  return Math.floor((Date.now() - new Date(birthIso).getTime()) / 86400000);
};

export const ageString = (birthIso: string | null | undefined) => {
  const d = ageDays(birthIso);
  if (d === null) return "—";
  if (d < 14) return `${d}d`;
  const w = Math.floor(d / 7);
  if (w < 12) return `${w}w`;
  const m = Math.floor(d / 30);
  return `${m}mo`;
};
