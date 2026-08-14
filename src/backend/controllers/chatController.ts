import { uploadMidia } from "../services/supabaseService.js";
import { sendImage, sendFile } from "../services/wagoGateway.js";
import { atualizarStatusPorAck } from "../services/supabaseService.js";
import type { Request, Response } from "express";
import { sendText } from "../services/wagoGateway.js";
import {
  findOrCreateContato,
  salvarMensagem,
  listarContatos,
  listarMensagens,
} from "../services/supabaseService.js";

export async function sendMessageHandler(req: Request, res: Response) {
  try {
    const { telefone, texto } = req.body as { telefone: string; texto: string };

    if (!telefone || !texto) {
      res.status(400).json({ error: "telefone e texto são obrigatórios" });
      return;
    }

    const contato = await findOrCreateContato(telefone);
    const wagoResult = await sendText(telefone, texto);

    const mensagem = await salvarMensagem({
      contato_id: contato.id,
      direcao: "saida",
      tipo: "texto",
      conteudo: texto,
      wago_message_id: wagoResult.id,
    });

    res.json({ mensagem });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

export async function listContatosHandler(_req: Request, res: Response) {
  try {
    const contatos = await listarContatos();
    res.json({ contatos });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

export async function listMensagensHandler(req: Request, res: Response) {
  try {
    const { contatoId } = req.params as { contatoId: string };
    const mensagens = await listarMensagens(contatoId);
    res.json({ mensagens });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

function extrairTelefoneDoPayload(payload: {
  from?: string;
  _data?: { key?: { remoteJidAlt?: string } };
}): string {
  const from = payload.from ?? "";

  if (from.endsWith("@c.us")) {
    return from.replace("@c.us", "");
  }

  // Contato migrado para @lid — o número real vem em remoteJidAlt
  const remoteJidAlt = payload._data?.key?.remoteJidAlt;
  if (remoteJidAlt && remoteJidAlt.endsWith("@s.whatsapp.net")) {
    return remoteJidAlt.replace("@s.whatsapp.net", "");
  }

  // Último recurso: usa o que vier antes do @, mesmo que seja o LID
  return from.split("@")[0];
}

// Recebe eventos do WAHA quando uma mensagem chega
export async function webhookHandler(req: Request, res: Response) {
  try {
    const event = req.body as {
      event: string;
      payload?: {
        from?: string;
        body?: string;
        fromMe?: boolean;
        id?: string;
        ack?: number;
        _data?: { key?: { remoteJidAlt?: string } };
      };
    };

    if (
      event.event === "message" &&
      event.payload &&
      !event.payload.fromMe &&
      !(event.payload.from ?? "").endsWith("@g.us")
    ) {
      const telefone = extrairTelefoneDoPayload(event.payload);
      const texto = event.payload.body ?? "";

      if (telefone && texto) {
        const contato = await findOrCreateContato(telefone);
        await salvarMensagem({
          contato_id: contato.id,
          direcao: "entrada",
          tipo: "texto",
          conteudo: texto,
          wago_message_id: event.payload.id,
        });
      }
    }

    if (event.event === "message.ack" && event.payload?.id && event.payload.ack !== undefined) {
      const ack = event.payload.ack;

      if (ack >= 3) {
        await atualizarStatusPorAck(event.payload.id, "lido");
      } else if (ack >= 2) {
        await atualizarStatusPorAck(event.payload.id, "entregue");
      }
      // ack === 1 (enviado ao servidor) não precisa de ação — já é o status inicial
    }

    res.json({ received: true });
  } catch (err) {
    console.error("Erro ao processar webhook:", err);
    res.json({ received: true, error: (err as Error).message });
  }
}

export async function sendMediaHandler(req: Request, res: Response) {
  try {
    const file = req.file;
    const { telefone, legenda } = req.body as { telefone: string; legenda?: string };

    if (!file || !telefone) {
      res.status(400).json({ error: "arquivo e telefone são obrigatórios" });
      return;
    }

    const url = await uploadMidia(file.buffer, file.originalname, file.mimetype);
    const isImagem = file.mimetype.startsWith("image/");

    const contato = await findOrCreateContato(telefone);
    const wagoResult = isImagem
      ? await sendImage(telefone, url, legenda)
      : await sendFile(telefone, url, file.originalname);

    const mensagem = await salvarMensagem({
      contato_id: contato.id,
      direcao: "saida",
      tipo: isImagem ? "imagem" : "documento",
      conteudo: legenda ?? file.originalname,
      wago_message_id: wagoResult.id,
    });

    res.json({ mensagem, url });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}