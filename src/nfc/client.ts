import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { NfcStatus, WriteRequest } from "./types";

const defaultStatus = (): NfcStatus => ({
  phase: "idle",
  readerConnected: false,
  mockMode: true,
  tag: null,
  lastPayload: null,
  message: "Frontend-Mock aktiv (ohne Tauri). Ideal für UI-Arbeit im Browser.",
});

function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

let browserMock: NfcStatus = defaultStatus();

async function call<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauriRuntime()) {
    throw new Error("BROWSER_MOCK");
  }
  return invoke<T>(command, args);
}

export async function getNfcStatus(): Promise<NfcStatus> {
  try {
    return await call<NfcStatus>("get_nfc_status");
  } catch {
    return { ...browserMock };
  }
}

export async function simulateTagPresent(): Promise<NfcStatus> {
  try {
    return await call<NfcStatus>("simulate_tag_present");
  } catch {
    browserMock = {
      ...browserMock,
      phase: "tagPresent",
      tag: {
        uid: "04:A1:B2:C3:D4:E5:F6",
        chipType: "NTAG215",
        writable: true,
        capacityBytes: 504,
      },
      message: "Chip erkannt (Browser-Mock). Bereit zum Schreiben.",
    };
    return { ...browserMock };
  }
}

export async function clearTag(): Promise<NfcStatus> {
  try {
    return await call<NfcStatus>("clear_tag");
  } catch {
    browserMock = {
      ...defaultStatus(),
      message: "Kein Chip. Lege einen Tag auf den Reader.",
    };
    return { ...browserMock };
  }
}

export async function writeNdef(request: WriteRequest): Promise<NfcStatus> {
  try {
    return await call<NfcStatus>("write_ndef", { request });
  } catch {
    if (!browserMock.tag) {
      browserMock = {
        ...browserMock,
        phase: "error",
        message: "Kein Chip vorhanden. Zuerst Tag simulieren.",
      };
      return { ...browserMock };
    }

    const payload = request.payload.trim();
    if (!payload) {
      browserMock = {
        ...browserMock,
        phase: "error",
        message: "Payload ist leer.",
      };
      return { ...browserMock };
    }

    browserMock = {
      ...browserMock,
      phase: "success",
      lastPayload: payload,
      message: `NDEF (${request.kind}) geschrieben (Browser-Mock).`,
    };
    return { ...browserMock };
  }
}

/** Live-Updates vom PC/SC-Watcher (nur in Tauri). */
export async function subscribeNfcStatus(
  onStatus: (status: NfcStatus) => void,
): Promise<() => void> {
  if (!isTauriRuntime()) {
    return () => undefined;
  }

  let unlisten: UnlistenFn | undefined;
  try {
    unlisten = await listen<NfcStatus>("nfc-status", (event) => {
      onStatus(event.payload);
    });
  } catch {
    return () => undefined;
  }

  return () => {
    unlisten?.();
  };
}
