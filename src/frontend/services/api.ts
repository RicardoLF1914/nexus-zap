const BASE_URL = "/api/wago";

export interface SessionInfo {
  name: string;
  status: "STOPPED" | "STARTING" | "SCAN_QR_CODE" | "WORKING" | "FAILED";
}

export async function connectWhatsapp(): Promise<SessionInfo> {
  const res = await fetch(`${BASE_URL}/connect`, { method: "POST" });
  if (!res.ok) throw new Error("Falha ao conectar");
  return (await res.json()) as SessionInfo;
}

export async function getStatus(): Promise<SessionInfo> {
  const res = await fetch(`${BASE_URL}/status`);
  if (!res.ok) throw new Error("Falha ao consultar status");
  return (await res.json()) as SessionInfo;
}

export async function getQrCode(): Promise<string> {
  const res = await fetch(`${BASE_URL}/qr`);
  if (!res.ok) throw new Error("Falha ao obter QR Code");
  const data = (await res.json()) as { qr: string };
  return data.qr;
}