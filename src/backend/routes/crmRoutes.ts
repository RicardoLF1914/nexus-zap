import { Router } from "express";
import {
  getContatoHandler,
  updateContatoHandler,
  listTagsHandler,
  createTagHandler,
  linkTagHandler,
  unlinkTagHandler,
  listEtapasHandler,
  updateEtapaHandler,
  createAnotacaoHandler,
  listAnotacoesHandler,
} from "../controllers/crmController.js";

const router = Router();

router.get("/contato/:telefone", getContatoHandler);
router.put("/contato/:contatoId", updateContatoHandler);
router.get("/tags", listTagsHandler);
router.post("/tags", createTagHandler);
router.post("/contato/:contatoId/tags/:tagId", linkTagHandler);
router.delete("/contato/:contatoId/tags/:tagId", unlinkTagHandler);
router.get("/etapas", listEtapasHandler);
router.put("/contato/:contatoId/etapa", updateEtapaHandler);
router.post("/contato/:contatoId/anotacoes", createAnotacaoHandler);
router.get("/contato/:contatoId/anotacoes", listAnotacoesHandler);

export default router;