export interface MensagemLista {
  id: string;
  direcao: "entrada" | "saida";
  tipo: "texto" | "imagem" | "video" | "audio" | "documento" | "contato" | "figurinha" | "localizacao";
  conteudo: string | null;
  midia_url: string | null;
  created_at: string;
}

export async function listarMensagensDoContato(contatoId: string): Promise<MensagemLista[]> {
  const res = await fetch(`/api/chat/contatos/${contatoId}/mensagens`);
  if (!res.ok) throw new Error("Falha ao listar mensagens");
  const data = (await res.json()) as { mensagens: MensagemLista[] };
  return data.mensagens;
}

export function renderizarBolha(msg: MensagemLista): string {
  const hora = new Date(msg.created_at).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  let conteudoHtml = "";

  switch (msg.tipo) {
    case "imagem":
      conteudoHtml = `<img class="message-bubble__midia" src="${msg.midia_url}" alt="Imagem" />${msg.conteudo ? `<div>${msg.conteudo}</div>` : ""}`;
      break;
    case "audio":
      conteudoHtml = `<audio controls src="${msg.midia_url}"></audio>`;
      break;
    case "documento":
      conteudoHtml = `<a class="message-bubble__doc-link" href="${msg.midia_url}" target="_blank">📄 ${msg.conteudo ?? "Documento"}</a>`;
      break;
    case "localizacao": {
      const [lat, lng] = (msg.conteudo ?? "").split(",");
      conteudoHtml = `<a class="message-bubble__doc-link" href="https://maps.google.com/?q=${lat},${lng}" target="_blank">📍 Localização compartilhada</a>`;
      break;
    }
    case "contato":
      conteudoHtml = `👤 ${msg.conteudo ?? "Contato compartilhado"}`;
      break;
    default:
      conteudoHtml = msg.conteudo ?? "";
  }

  return `
    <div class="message-bubble message-bubble--${msg.direcao}">
      ${conteudoHtml}
      <div class="message-bubble__hora">${hora}</div>
    </div>
  `;
}