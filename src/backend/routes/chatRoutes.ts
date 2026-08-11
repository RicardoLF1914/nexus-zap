import { Router } from "express";
import {
  sendMessageHandler,
  listContatosHandler,
  listMensagensHandler,
  webhookHandler,
} from "../controllers/chatController.js";

const router = Router();

router.post("/send", sendMessageHandler);
router.get("/contatos", listContatosHandler);
router.get("/contatos/:contatoId/mensagens", listMensagensHandler);
router.post("/webhook", webhookHandler);

export default router;