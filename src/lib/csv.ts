/**
 * Minimal RFC 4180 CSV writer.
 * Cells starting with = + - @ (or tab/CR) are prefixed with an apostrophe so spreadsheet apps
 * cannot execute them as formulas (CSV injection) — attendee names and titles are user-controlled.
 */
export type CsvCell = string | number | boolean | null | undefined;

function escapeCell(value: CsvCell): string {
  if (value === null || value === undefined) return "";
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s) && typeof value === "string") s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsvRow(cells: CsvCell[]): string {
  return cells.map(escapeCell).join(",") + "\r\n";
}

export function toCsv(header: string[], rows: CsvCell[][]): string {
  return "﻿" + toCsvRow(header) + rows.map(toCsvRow).join(""); // BOM so Excel reads UTF-8
}

const IST = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
});

/** "2026-11-19 14:05:09" in IST, or empty. */
export function istStamp(iso: string | null | undefined): string {
  return iso ? IST.format(new Date(iso)) : "";
}

export const minutes = (seconds: number | null | undefined): number | "" =>
  seconds === null || seconds === undefined ? "" : Math.round((seconds / 60) * 10) / 10;
