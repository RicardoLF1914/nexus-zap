export interface TagInfo {
  id: string;
  nome: string;
  cor: string;
}

export interface ContatoInfo {
  id: string;
  telefone: string;
  nome: string | null;
  funil_etapa_id: string | null;
}

export async function carregarContato(
  telefone: string,
): Promise<{ contato: ContatoInfo; tags: TagInfo[] }> {
  const res = await fetch(`/api/crm/contato/${telefone}`);
  if (!res.ok) throw new Error("Falha ao carregar contato");
  return res.json();
}

export async function listarTodasTags(): Promise<TagInfo[]> {
  const res = await fetch("/api/crm/tags");
  if (!res.ok) throw new Error("Falha ao listar tags");
  const data = (await res.json()) as { tags: TagInfo[] };
  return data.tags;
}

export async function criarNovaTag(nome: string, cor: string): Promise<TagInfo> {
  const res = await fetch("/api/crm/tags", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome, cor }),
  });
  if (!res.ok) throw new Error("Falha ao criar tag");
  const data = (await res.json()) as { tag: TagInfo };
  return data.tag;
}

export async function vincularTagAoContato(contatoId: string, tagId: string): Promise<void> {
  const res = await fetch(`/api/crm/contato/${contatoId}/tags/${tagId}`, { method: "POST" });
  if (!res.ok) throw new Error("Falha ao vincular tag");
}

export async function desvincularTagDoContato(contatoId: string, tagId: string): Promise<void> {
  const res = await fetch(`/api/crm/contato/${contatoId}/tags/${tagId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Falha ao desvincular tag");
}

export async function atualizarNomeContato(contatoId: string, nome: string): Promise<void> {
  const res = await fetch(`/api/crm/contato/${contatoId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome }),
  });
  if (!res.ok) throw new Error("Falha ao atualizar contato");
}

export interface EtapaInfo {
  id: string;
  nome: string;
  ordem: number;
  cor: string;
}

export interface AnotacaoInfo {
  id: string;
  conteudo: string;
  created_at: string;
}

export async function listarEtapas(): Promise<EtapaInfo[]> {
  const res = await fetch("/api/crm/etapas");
  if (!res.ok) throw new Error("Falha ao listar etapas");
  const data = (await res.json()) as { etapas: EtapaInfo[] };
  return data.etapas;
}

export async function atualizarEtapa(contatoId: string, funilEtapaId: string): Promise<void> {
  const res = await fetch(`/api/crm/contato/${contatoId}/etapa`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ funilEtapaId }),
  });
  if (!res.ok) throw new Error("Falha ao atualizar etapa");
}

export async function criarAnotacaoContato(contatoId: string, conteudo: string): Promise<void> {
  const res = await fetch(`/api/crm/contato/${contatoId}/anotacoes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conteudo }),
  });
  if (!res.ok) throw new Error("Falha ao criar anotação");
}

export async function listarAnotacoesContato(contatoId: string): Promise<AnotacaoInfo[]> {
  const res = await fetch(`/api/crm/contato/${contatoId}/anotacoes`);
  if (!res.ok) throw new Error("Falha ao listar anotações");
  const data = (await res.json()) as { anotacoes: AnotacaoInfo[] };
  return data.anotacoes;
}