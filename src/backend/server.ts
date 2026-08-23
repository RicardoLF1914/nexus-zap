import { authMiddleware } from "./middlewares/authMiddleware.js";
import authRoutes from "./routes/authRoutes.js";
import express, { type Request, type Response, type NextFunction } from "express";
import crmRoutes from "./routes/crmRoutes.js";
import wagoRoutes from "./routes/wagoRoutes";
import chatRoutes from "./routes/chatRoutes.js";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

app.use(express.json());
app.use("/api/auth", authRoutes);
app.use(authMiddleware);
app.use(express.static(path.join(__dirname, "..", "..", "public")));
app.use("/api/wago", wagoRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/crm", crmRoutes);
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Erro não tratado:", err);
  res.status(500).json({ error: "Erro interno no servidor" });
});

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "nexus-zap" });
});

app.listen(PORT, async () => {
  console.log(`NexusZap server rodando em http://localhost:${PORT}`);

  try {
    const { configureWebhook } = await import("./services/wagoGateway.js");
    await configureWebhook(`http://host.docker.internal:${PORT}/api/chat/webhook`);
    console.log("Webhook do WAHA configurado");
  } catch (err) {
    console.error("Falha ao configurar webhook do WAHA:", (err as Error).message);
  }
});