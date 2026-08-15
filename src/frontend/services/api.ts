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

export async function sendMessage(telefone: string, texto: string): Promise<void> {
  const res = await fetch("/api/chat/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ telefone, texto }),
  });
  if (!res.ok) throw new Error("Falha ao enviar mensagem");
}

export async function sendMedia(
  telefone: string,
  file: File,
  legenda: string,
): Promise<void> {
  const formData = new FormData();
  formData.append("telefone", telefone);
  formData.append("legenda", legenda);
  formData.append("arquivo", file);

  const res = await fetch("/api/chat/send-media", {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Falha ao enviar mídia");
}

export async function sendLocationMessage(
  telefone: string,
  latitude: number,
  longitude: number,
): Promise<void> {
  const res = await fetch("/api/chat/send-location", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ telefone, latitude, longitude }),
  });
  if (!res.ok) throw new Error("Falha ao enviar localização");
}

export async function sendContactMessage(
  telefone: string,
  contatoNome: string,
  contatoTelefone: string,
): Promise<void> {
  const res = await fetch("/api/chat/send-contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ telefone, contatoNome, contatoTelefone }),
  });
  if (!res.ok) throw new Error("Falha ao enviar contato");
}