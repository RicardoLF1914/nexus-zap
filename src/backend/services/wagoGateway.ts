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