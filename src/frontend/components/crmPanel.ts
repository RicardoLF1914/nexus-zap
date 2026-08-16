export interface TagInfo {
  id: string;
  nome: string;
  cor: string;
}

export interface ContatoInfo {
  id: string;
  telefone: string;
  nome: string | null;
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