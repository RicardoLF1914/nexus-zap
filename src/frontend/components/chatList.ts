export interface ContatoLista {
  id: string;
  telefone: string;
  nome: string | null;
  updated_at: string;
}

export async function listarContatosParaLista(): Promise<ContatoLista[]> {
  const res = await fetch("/api/chat/contatos");
  if (!res.ok) throw new Error("Falha ao listar contatos");
  const data = (await res.json()) as { contatos: ContatoLista[] };
  return data.contatos;
}