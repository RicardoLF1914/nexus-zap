import { Router } from "express";
import { connectHandler, statusHandler, qrHandler } from "../controllers/wagoController";

const router = Router();

router.post("/connect", connectHandler);
router.get("/status", statusHandler);
router.get("/qr", qrHandler);

export default router;