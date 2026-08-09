import type { Request, Response } from "express";
import { connectSession, getSessionStatus, getQrCodeBase64 } from "../services/wagoGateway";

export async function connectHandler(_req: Request, res: Response) {
  try {
    const session = await connectSession();
    res.json(session);
  } catch (err) {
    res.status(502).json({ error: (err as Error).message });
  }
}

export async function statusHandler(_req: Request, res: Response) {
  try {
    const session = await getSessionStatus();
    res.json(session);
  } catch (err) {
    res.status(502).json({ error: (err as Error).message });
  }
}

export async function qrHandler(_req: Request, res: Response) {
  try {
    const qr = await getQrCodeBase64();
    res.json({ qr });
  } catch (err) {
    res.status(502).json({ error: (err as Error).message });
  }
}