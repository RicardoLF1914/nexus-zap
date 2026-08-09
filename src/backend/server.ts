import express, { type Request, type Response } from "express";
import wagoRoutes from "./routes/wagoRoutes";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "..", "public")));

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "nexus-zap" });
});

app.listen(PORT, () => {
  console.log(`NexusZap server rodando em http://localhost:${PORT}`);
});

app.use("/api/wago", wagoRoutes);