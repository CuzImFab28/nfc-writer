export type AppTool = "nfc" | "qr";

export const TOOL_LABELS: Record<AppTool, string> = {
  nfc: "NFC Writer",
  qr: "QR Generator",
};
