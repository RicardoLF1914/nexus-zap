import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (client) return client;

  const url = process.env.SUPABASE_URL ?? "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY precisam estar definidos no .env",
    );
  }

  client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });

  return client;
}

import type { Contato, Mensagem, MensagemDirecao, MensagemTipo } from "../types/index.js";

export async function findOrCreateContato(telefone: string): Promise<Contato> {
  const supabase = getSupabaseClient();

  const { data: existing, error: findError } = await supabase
    .from("contatos")
    .select("*")
    .eq("telefone", telefone)
    .maybeSingle();

  if (findError) throw findError;
  if (existing) return existing as Contato;

  const { data: created, error: createError } = await supabase
    .from("contatos")
    .insert({ telefone })
    .select()
    .single();

  if (createError) throw createError;
  return created as Contato;
}

export async function salvarMensagem(params: {
  contato_id: string;
  direcao: MensagemDirecao;
  tipo: MensagemTipo;
  conteudo: string;
  wago_message_id?: string;
  midia_url?: string;
}): Promise<Mensagem> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("mensagens")
    .insert({
      contato_id: params.contato_id,
      direcao: params.direcao,
      tipo: params.tipo,
      conteudo: params.conteudo,
      midia_url: params.midia_url ?? null,
      wago_message_id: params.wago_message_id ?? null,
      status: params.direcao === "saida" ? "enviado" : "entregue",
    })
    .select()
    .single();

  if (error) throw error;
  return data as Mensagem;
}

export async function listarContatos(): Promise<Contato[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("contatos")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data as Contato[];
}

export async function listarMensagens(contatoId: string): Promise<Mensagem[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("mensagens")
    .select("*")
    .eq("contato_id", contatoId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data as Mensagem[];
}

export async function atualizarStatusPorAck(
  wagoMessageId: string,
  novoStatus: "entregue" | "lido",
): Promise<void> {
  const supabase = getSupabaseClient();

  // Nunca retrocede: só atualiza se o status atual for "antes" do novo
  // enviado < entregue < lido
  const ordem = { enviado: 0, entregue: 1, lido: 2 };

  const { data: atual, error: findError } = await supabase
    .from("mensagens")
    .select("id, status")
    .eq("wago_message_id", wagoMessageId)
    .maybeSingle();

  if (findError) throw findError;
  if (!atual) return; // mensagem não encontrada, ignora silenciosamente

  const statusAtual = atual.status as keyof typeof ordem;
  if (ordem[novoStatus] <= (ordem[statusAtual] ?? -1)) {
    return; // já está num estado igual ou mais avançado, não retrocede
  }

  const { error: updateError } = await supabase
    .from("mensagens")
    .update({ status: novoStatus })
    .eq("id", atual.id);

  if (updateError) throw updateError;
}

function sanitizeFileName(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[^a-zA-Z0-9._-]/g, "-") // troca qualquer caractere não permitido por hífen
    .replace(/-+/g, "-"); // colapsa hífens repetidos
}

export async function uploadMidia(
  buffer: Buffer,
  nomeArquivo: string,
  contentType: string,
): Promise<string> {
  const supabase = getSupabaseClient();
  const nomeSeguro = sanitizeFileName(nomeArquivo);
  const caminho = `${Date.now()}-${nomeSeguro}`;

  const { error } = await supabase.storage
    .from("Midias")
    .upload(caminho, buffer, { contentType });

  if (error) throw error;

  const { data } = supabase.storage.from("Midias").getPublicUrl(caminho);
  return data.publicUrl;
}