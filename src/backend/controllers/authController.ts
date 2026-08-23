import type { Request, Response } from "express";

export function loginHandler(req: Request, res: Response) {
  const { senha } = req.body as { senha: string };
  const senhaCorreta = process.env.APP_PASSWORD ?? "";
  const sessionSecret = process.env.SESSION_SECRET ?? "";

  if (!senhaCorreta || senha !== senhaCorreta) {
    res.status(401).json({ error: "Senha incorreta" });
    return;
  }

  res.setHeader(
    "Set-Cookie",
    `nexuszap_session=${sessionSecret}; HttpOnly; Path=/; SameSite=Strict; Max-Age=86400`,
  );
  res.json({ success: true });
}