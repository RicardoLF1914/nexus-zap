export interface FunilEtapa {
  id: string;
  nome: string;
  ordem: number;
  cor: string;
  created_at: string;
}

export interface Contato {
  id: string;
  telefone: string;
  nome: string | null;
  foto_url: string | null;
  funil_etapa_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  nome: string;
  cor: string;
  created_at: string;
}

export type MensagemDirecao = "entrada" | "saida";

export type MensagemTipo =
  | "texto"
  | "imagem"
  | "video"
  | "audio"
  | "documento"
  | "contato"
  | "figurinha"
  | "localizacao";

export type MensagemStatus = "enviado" | "entregue" | "lido" | "falhou";

export interface Mensagem {
  id: string;
  contato_id: string;
  direcao: MensagemDirecao;
  tipo: MensagemTipo;
  conteudo: string | null;
  midia_url: string | null;
  wago_message_id: string | null;
  status: MensagemStatus;
  created_at: string;
}

export interface Anotacao {
  id: string;
  contato_id: string;
  conteudo: string;
  created_at: string;
}