import type { Request, Response } from "express";
import {
  findOrCreateContato,
  criarTag,
  listarTags,
  vincularTag,
  desvincularTag,
  listarTagsDoContato,
  atualizarPerfilContato,
  listarEtapasFunil,
  atualizarEtapaContato,
  criarAnotacao,
  listarAnotacoes,
} from "../services/supabaseService.js";

export async function getContatoHandler(req: Request, res: Response) {
  try {
    const { telefone } = req.params as { telefone: string };
    const contato = await findOrCreateContato(telefone);
    const tags = await listarTagsDoContato(contato.id);
    res.json({ contato, tags });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

export async function updateContatoHandler(req: Request, res: Response) {
  try {
    const { contatoId } = req.params as { contatoId: string };
    const { nome } = req.body as { nome: string };
    const contato = await atualizarPerfilContato(contatoId, nome);
    res.json({ contato });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

export async function listTagsHandler(_req: Request, res: Response) {
  try {
    const tags = await listarTags();
    res.json({ tags });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

export async function createTagHandler(req: Request, res: Response) {
  try {
    const { nome, cor } = req.body as { nome: string; cor: string };
    const tag = await criarTag(nome, cor);
    res.json({ tag });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

export async function linkTagHandler(req: Request, res: Response) {
  try {
    const { contatoId, tagId } = req.params as { contatoId: string; tagId: string };
    await vincularTag(contatoId, tagId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

export async function unlinkTagHandler(req: Request, res: Response) {
  try {
    const { contatoId, tagId } = req.params as { contatoId: string; tagId: string };
    await desvincularTag(contatoId, tagId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

export async function listEtapasHandler(_req: Request, res: Response) {
  try {
    const etapas = await listarEtapasFunil();
    res.json({ etapas });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

export async function updateEtapaHandler(req: Request, res: Response) {
  try {
    const { contatoId } = req.params as { contatoId: string };
    const { funilEtapaId } = req.body as { funilEtapaId: string };
    const contato = await atualizarEtapaContato(contatoId, funilEtapaId);
    res.json({ contato });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

export async function createAnotacaoHandler(req: Request, res: Response) {
  try {
    const { contatoId } = req.params as { contatoId: string };
    const { conteudo } = req.body as { conteudo: string };
    const anotacao = await criarAnotacao(contatoId, conteudo);
    res.json({ anotacao });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

export async function listAnotacoesHandler(req: Request, res: Response) {
  try {
    const { contatoId } = req.params as { contatoId: string };
    const anotacoes = await listarAnotacoes(contatoId);
    res.json({ anotacoes });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}