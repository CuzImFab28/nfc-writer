import type { NfcStatus, SessionPhase } from "./types";

/** Chip erkannt — Quelle ist später PC/SC; aktuell Mock via `status.tag`. */
export function isChipPresent(status: NfcStatus): boolean {
  return status.tag != null;
}

export function phaseStatusLabel(phase: SessionPhase, chipPresent: boolean): string {
  if (phase === "writing") return "Schreibe…";
  if (phase === "success") return "Geschrieben";
  if (phase === "error") return "Fehler";
  return chipPresent ? "Chip erkannt" : "Kein Chip";
}
