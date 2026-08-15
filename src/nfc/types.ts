export type SessionPhase =
  | "idle"
  | "waitingForTag"
  | "tagPresent"
  | "writing"
  | "success"
  | "error";

export type TagInfo = {
  uid: string;
  chipType: string;
  writable: boolean;
  capacityBytes: number;
};

export type NfcStatus = {
  phase: SessionPhase;
  readerConnected: boolean;
  mockMode: boolean;
  tag: TagInfo | null;
  lastPayload: string | null;
  message: string;
};

export type WriteRequest = {
  payload: string;
  kind: "url" | "text";
};
