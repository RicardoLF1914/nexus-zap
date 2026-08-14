import { Router } from "express";
import multer from "multer";
import {
  sendMessageHandler,
  sendMediaHandler,
  listContatosHandler,
  listMensagensHandler,
  webhookHandler,
} from "../controllers/chatController.js";

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

router.post("/send", sendMessageHandler);
router.post("/send-media", upload.single("arquivo"), sendMediaHandler);
router.get("/contatos", listContatosHandler);
router.get("/contatos/:contatoId/mensagens", listMensagensHandler);
router.post("/webhook", webhookHandler);

export default router;