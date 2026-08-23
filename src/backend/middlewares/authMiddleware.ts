import type { Request, Response, NextFunction } from "express";

function parseCookies(header: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!header) return cookies;

  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key) cookies[key] = decodeURIComponent(rest.join("="));
  }
  return cookies;
}

const ROTAS_PUBLICAS = ["/login.html", "/api/auth/login", "/api/chat/webhook"];
const PREFIXOS_PUBLICOS = ["/css/", "/js/"];

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const isPublico =
    ROTAS_PUBLICAS.includes(req.path) ||
    PREFIXOS_PUBLICOS.some((prefixo) => req.path.startsWith(prefixo));

  if (isPublico) {
    next();
    return;
  }

  const cookies = parseCookies(req.headers.cookie);
  const sessionSecret = process.env.SESSION_SECRET ?? "";

  if (cookies.nexuszap_session === sessionSecret && sessionSecret) {
    next();
    return;
  }

  if (req.path.startsWith("/api/")) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }

  res.redirect("/login.html");
}