type SessionStatus =
  | "STOPPED"
  | "STARTING"
  | "SCAN_QR_CODE"
  | "WORKING"
  | "FAILED";

interface SessionInfo {
  name: string;
  status: SessionStatus;
}

function config() {
  return {
    apiUrl: process.env.WAGO_API_URL ?? "http://localhost:3000",
    apiKey: process.env.WAGO_API_KEY ?? "",
    sessionName: process.env.WAGO_SESSION_NAME ?? "default",
  };
}

function headers(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "X-Api-Key": config().apiKey,
  };
}

export async function createSession(): Promise<SessionInfo> {
  const { apiUrl, sessionName } = config();
  const res = await fetch(`${apiUrl}/api/sessions`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ name: sessionName }),
  });

  if (!res.ok && res.status !== 422) {
    throw new Error(`Falha ao criar sessão WAHA: ${res.status}`);
  }

  return (await res.json()) as SessionInfo;
}

export async function startSession(): Promise<SessionInfo> {
  const { apiUrl, sessionName } = config();
  const res = await fetch(`${apiUrl}/api/sessions/${sessionName}/start`, {
    method: "POST",
    headers: headers(),
  });

  if (!res.ok) {
    throw new Error(`Falha ao iniciar sessão WAHA: ${res.status}`);
  }

  return (await res.json()) as SessionInfo;
}

export async function connectSession(): Promise<SessionInfo> {
  await createSession();
  return startSession();
}

export async function getSessionStatus(): Promise<SessionInfo> {
  const { apiUrl, sessionName } = config();
  const res = await fetch(`${apiUrl}/api/sessions/${sessionName}`, {
    headers: headers(),
  });

  if (!res.ok) {
    throw new Error(`Falha ao consultar status da sessão: ${res.status}`);
  }

  return (await res.json()) as SessionInfo;
}

export async function getQrCodeBase64(): Promise<string> {
  const { apiUrl, sessionName } = config();
  const res = await fetch(
    `${apiUrl}/api/${sessionName}/auth/qr?format=image`,
    { headers: headers() },
  );

  if (!res.ok) {
    throw new Error(`Falha ao obter QR Code: ${res.status}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

export async function configureWebhook(webhookUrl: string): Promise<void> {
  const { apiUrl, sessionName } = config();
  const res = await fetch(`${apiUrl}/api/sessions/${sessionName}`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify({
      config: {
        webhooks: [{ url: webhookUrl, events: ["message", "message.ack"] }],
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Falha ao configurar webhook: ${res.status}`);
  }
}

export async function checkNumberExists(
  phone: string,
): Promise<{ exists: boolean; chatId: string | null }> {
  const { apiUrl, sessionName } = config();
  const res = await fetch(
    `${apiUrl}/api/contacts/check-exists?phone=${phone}&session=${sessionName}`,
    { headers: headers() },
  );

  if (!res.ok) {
    throw new Error(`Falha ao checar número: ${res.status}`);
  }

  const data = (await res.json()) as { numberExists: boolean; chatId: string | null };
  return { exists: data.numberExists, chatId: data.chatId };
}

export async function sendText(
  phone: string,
  text: string,
): Promise<{ id: string }> {
  const { apiUrl, sessionName } = config();

  const { exists, chatId } = await checkNumberExists(phone);

  if (!exists || !chatId) {
    throw new Error(`Número não encontrado no WhatsApp: ${phone}`);
  }

  const res = await fetch(`${apiUrl}/api/sendText`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      session: sessionName,
      chatId,
      text,
    }),
  });

  if (!res.ok) {
    throw new Error(`Falha ao enviar mensagem: ${res.status}`);
  }

  return (await res.json()) as { id: string };
}

export async function sendImage(
  phone: string,
  imageUrl: string,
  caption?: string,
): Promise<{ id: string }> {
  const { apiUrl, sessionName } = config();
  const { exists, chatId } = await checkNumberExists(phone);

  if (!exists || !chatId) {
    throw new Error(`Número não encontrado no WhatsApp: ${phone}`);
  }

  const res = await fetch(`${apiUrl}/api/sendImage`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      session: sessionName,
      chatId,
      file: { url: imageUrl },
      caption: caption ?? "",
    }),
  });

  if (!res.ok) {
    throw new Error(`Falha ao enviar imagem: ${res.status}`);
  }

  return (await res.json()) as { id: string };
}

export async function sendFile(
  phone: string,
  fileUrl: string,
  filename: string,
): Promise<{ id: string }> {
  const { apiUrl, sessionName } = config();
  const { exists, chatId } = await checkNumberExists(phone);

  if (!exists || !chatId) {
    throw new Error(`Número não encontrado no WhatsApp: ${phone}`);
  }

  const res = await fetch(`${apiUrl}/api/sendFile`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      session: sessionName,
      chatId,
      file: { url: fileUrl, filename },
    }),
  });

  if (!res.ok) {
    throw new Error(`Falha ao enviar arquivo: ${res.status}`);
  }

  return (await res.json()) as { id: string };
}

export async function downloadMedia(
  mediaUrl: string,
): Promise<{ buffer: Buffer; contentType: string }> {
  const { apiUrl } = config();
  const caminho = new URL(mediaUrl).pathname;
  const urlReal = `${apiUrl}${caminho}`;

  const res = await fetch(urlReal, { headers: headers() });
  if (!res.ok) {
    throw new Error(`Falha ao baixar mídia: ${res.status}`);
  }

  const contentType = res.headers.get("content-type") ?? "application/octet-stream";
  const buffer = Buffer.from(await res.arrayBuffer());
  return { buffer, contentType };
}

export async function sendVoice(
  phone: string,
  audioUrl: string,
): Promise<{ id: string }> {
  const { apiUrl, sessionName } = config();
  const { exists, chatId } = await checkNumberExists(phone);

  if (!exists || !chatId) {
    throw new Error(`Número não encontrado no WhatsApp: ${phone}`);
  }

  const res = await fetch(`${apiUrl}/api/sendVoice`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      session: sessionName,
      chatId,
      file: { url: audioUrl, mimetype: "audio/ogg" },
      convert: true,
    }),
  });

  if (!res.ok) {
    throw new Error(`Falha ao enviar áudio: ${res.status}`);
  }

  return (await res.json()) as { id: string };
}

export async function sendLocation(
  phone: string,
  latitude: number,
  longitude: number,
  title?: string,
): Promise<{ id: string }> {
  const { apiUrl, sessionName } = config();
  const { exists, chatId } = await checkNumberExists(phone);

  if (!exists || !chatId) {
    throw new Error(`Número não encontrado no WhatsApp: ${phone}`);
  }

  const res = await fetch(`${apiUrl}/api/sendLocation`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      session: sessionName,
      chatId,
      latitude,
      longitude,
      title: title ?? "Localização compartilhada",
    }),
  });

  if (!res.ok) {
    throw new Error(`Falha ao enviar localização: ${res.status}`);
  }

  return (await res.json()) as { id: string };
}

export async function sendContactVcard(
  phone: string,
  contatoNome: string,
  contatoTelefone: string,
): Promise<{ id: string }> {
  const { apiUrl, sessionName } = config();
  const { exists, chatId } = await checkNumberExists(phone);

  if (!exists || !chatId) {
    throw new Error(`Número não encontrado no WhatsApp: ${phone}`);
  }

  const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${contatoNome}\nTEL;type=CELL:${contatoTelefone}\nEND:VCARD`;

  const res = await fetch(`${apiUrl}/api/sendContactVcard`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      session: sessionName,
      chatId,
      contacts: [{ vcard }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Falha ao enviar contato: ${res.status}`);
  }

  return (await res.json()) as { id: string };
}