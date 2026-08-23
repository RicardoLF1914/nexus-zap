import type { Request, Response } from "express";
import { sendText, sendImage, sendFile, downloadMedia, sendVoice, sendLocation, sendContactVcard } from "../services/wagoGateway.js";
import {
  findOrCreateContato,
  salvarMensagem,
  listarContatos,
  listarMensagens,
  uploadMidia,
  mensagemJaExiste,
} from "../services/supabaseService.js";

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
    const isAudio = file.mimetype.startsWith("audio/");

    const contato = await findOrCreateContato(telefone);

    let wagoResult: { id: string };
    let tipo: "imagem" | "documento" | "audio";

    if (isAudio) {
      wagoResult = await sendVoice(telefone, url);
      tipo = "audio";
    } else if (isImagem) {
      wagoResult = await sendImage(telefone, url, legenda);
      tipo = "imagem";
    } else {
      wagoResult = await sendFile(telefone, url, file.originalname);
      tipo = "documento";
    }

    const mensagem = await salvarMensagem({
      contato_id: contato.id,
      direcao: "saida",
      tipo,
      conteudo: legenda ?? file.originalname,
      wago_message_id: wagoResult.id,
      midia_url: url,
    });

    res.json({ mensagem, url });
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
        hasMedia?: boolean;
        media?: { url?: string; filename?: string };
        _data?: { key?: { remoteJidAlt?: string } };
      };
    };

    if (
      event.event === "message" &&
      event.payload &&
      !(event.payload.from ?? "").includes("@broadcast")
    ) {
      const jaExiste = event.payload.id ? await mensagemJaExiste(event.payload.id) : false;

      if (!jaExiste) {
        const telefone = extrairTelefoneDoPayload(event.payload);
        const contato = await findOrCreateContato(telefone);
        const direcao = event.payload.fromMe ? "saida" : "entrada";

        if (event.payload.hasMedia && event.payload.media?.url) {
          const { buffer, contentType } = await downloadMedia(event.payload.media.url);
          const nomeArquivo = event.payload.media.filename ?? `midia-${Date.now()}`;
          const url = await uploadMidia(buffer, nomeArquivo, contentType);

          await salvarMensagem({
            contato_id: contato.id,
            direcao,
            tipo: contentType.startsWith("image/") ? "imagem" : "documento",
            conteudo: event.payload.body ?? "",
            wago_message_id: event.payload.id,
            midia_url: url,
          });
        } else {
          const texto = event.payload.body ?? "";
          if (texto) {
            await salvarMensagem({
              contato_id: contato.id,
              direcao,
              tipo: "texto",
              conteudo: texto,
              wago_message_id: event.payload.id,
            });
          }
        }
      }
    }

    if (event.event === "message.ack" && event.payload?.id && event.payload.ack !== undefined) {
      const { atualizarStatusPorAck } = await import("../services/supabaseService.js");
      const ack = event.payload.ack;

      if (ack >= 3) {
        await atualizarStatusPorAck(event.payload.id, "lido");
      } else if (ack >= 2) {
        await atualizarStatusPorAck(event.payload.id, "entregue");
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error("Erro ao processar webhook:", err);
    res.json({ received: true, error: (err as Error).message });
  }
}

export async function sendLocationHandler(req: Request, res: Response) {
  try {
    const { telefone, latitude, longitude, titulo } = req.body as {
      telefone: string;
      latitude: number;
      longitude: number;
      titulo?: string;
    };

    if (!telefone || latitude === undefined || longitude === undefined) {
      res.status(400).json({ error: "telefone, latitude e longitude são obrigatórios" });
      return;
    }

    const contato = await findOrCreateContato(telefone);
    const wagoResult = await sendLocation(telefone, latitude, longitude, titulo);

    const mensagem = await salvarMensagem({
      contato_id: contato.id,
      direcao: "saida",
      tipo: "localizacao",
      conteudo: `${latitude},${longitude}`,
      wago_message_id: wagoResult.id,
    });

    res.json({ mensagem });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

export async function sendContactHandler(req: Request, res: Response) {
  try {
    const { telefone, contatoNome, contatoTelefone } = req.body as {
      telefone: string;
      contatoNome: string;
      contatoTelefone: string;
    };

    if (!telefone || !contatoNome || !contatoTelefone) {
      res.status(400).json({ error: "telefone, contatoNome e contatoTelefone são obrigatórios" });
      return;
    }

    const contato = await findOrCreateContato(telefone);
    const wagoResult = await sendContactVcard(telefone, contatoNome, contatoTelefone);

    const mensagem = await salvarMensagem({
      contato_id: contato.id,
      direcao: "saida",
      tipo: "contato",
      conteudo: `${contatoNome} - ${contatoTelefone}`,
      wago_message_id: wagoResult.id,
    });

    res.json({ mensagem });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}