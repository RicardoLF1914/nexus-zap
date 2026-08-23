import { listarContatosParaLista, type ContatoLista } from "./components/chatList.js";
import { listarMensagensDoContato, renderizarBolha, type MensagemLista } from "./components/messageWindow.js";
import { mostrarToast } from "./components/toast.js";
import { connectWhatsapp, getStatus, getQrCode, type SessionInfo } from "./services/api.js";
import { criarUploaderDeMidia, type ArquivoSelecionado } from "./components/mediaUploader.js";
import { sendMessage, sendMedia, sendLocationMessage, sendContactMessage } from "./services/api.js";
import { criarGravadorDeAudio, type GravacaoConcluida } from "./components/audioRecorder.js";
import { obterLocalizacaoAtual } from "./components/locationPicker.js";
import {
  carregarContato,
  listarTodasTags,
  criarNovaTag,
  vincularTagAoContato,
  desvincularTagDoContato,
  atualizarNomeContato,
  listarEtapas,
  atualizarEtapa,
  criarAnotacaoContato,
  listarAnotacoesContato,
  type TagInfo,
  type ContatoInfo,
  type EtapaInfo,
} from "./components/crmPanel.js";

// ===== Modal de conexão WhatsApp =====

const modal = document.getElementById("wago-modal") as HTMLDivElement;
const qrImage = document.getElementById("wago-qr-image") as HTMLImageElement;
const statusBadge = document.getElementById("wago-status-badge") as HTMLSpanElement;
const openModalBtn = document.getElementById("open-wago-modal") as HTMLButtonElement;
const closeModalBtn = document.getElementById("close-wago-modal") as HTMLButtonElement;

let pollTimer: ReturnType<typeof setTimeout> | null = null;

function setStatusBadge(status: SessionInfo["status"]) {
  const isConnected = status === "WORKING";
  statusBadge.textContent = isConnected ? "Conectado" : "Desconectado";
  statusBadge.classList.toggle("status-badge--connected", isConnected);
  statusBadge.classList.toggle("status-badge--disconnected", !isConnected);
}

async function refreshQr() {
  try {
    const qr = await getQrCode();
    qrImage.src = qr;
  } catch {
    // QR pode não estar pronto ainda (ex: status ainda STARTING) — ignora e tenta de novo no próximo poll
  }
}

async function pollStatus() {
  try {
    const session = await getStatus();
    setStatusBadge(session.status);

    if (session.status === "SCAN_QR_CODE") {
      await refreshQr();
    }

    if (session.status === "WORKING") {
      modal.classList.remove("modal--open");
      return; // conectado, para o polling
    }

    if (session.status === "FAILED") {
      mostrarToast("A conexão com o WhatsApp falhou. Tentando reconectar...", "erro");
    }

    pollTimer = setTimeout(pollStatus, 3000);
  } catch {
    pollTimer = setTimeout(pollStatus, 5000);
  }
}

async function openModal() {
  modal.classList.add("modal--open");
  await connectWhatsapp();
  pollStatus();
}

function closeModal() {
  modal.classList.remove("modal--open");
  if (pollTimer) clearTimeout(pollTimer);
}

openModalBtn.addEventListener("click", openModal);
closeModalBtn.addEventListener("click", closeModal);

// Ao carregar a página, já verifica se existe sessão conectada
getStatus()
  .then((session) => setStatusBadge(session.status))
  .catch(() => setStatusBadge("STOPPED" as SessionInfo["status"]));

// ===== Composer: texto e mídia =====

const telefoneInput = document.getElementById("composer-telefone") as HTMLInputElement;
const textInput = document.getElementById("composer-text-input") as HTMLInputElement;
const sendBtn = document.getElementById("composer-send-btn") as HTMLButtonElement;
const attachBtn = document.getElementById("composer-attach-btn") as HTMLButtonElement;
const fileInput = document.getElementById("composer-file-input") as HTMLInputElement;
const previewBox = document.getElementById("composer-preview") as HTMLDivElement;
const previewThumb = document.getElementById("composer-preview-thumb") as HTMLImageElement;
const previewName = document.getElementById("composer-preview-name") as HTMLSpanElement;
const previewRemove = document.getElementById("composer-preview-remove") as HTMLButtonElement;

let arquivoAtual: ArquivoSelecionado | null = null;

criarUploaderDeMidia(fileInput, (arquivo) => {
  arquivoAtual = arquivo;

  if (arquivo) {
    previewBox.classList.add("composer__preview--visible");
    previewName.textContent = arquivo.file.name;
    if (arquivo.file.type.startsWith("image/")) {
      previewThumb.src = arquivo.previewUrl;
      previewThumb.style.display = "block";
    } else {
      previewThumb.style.display = "none";
    }
  } else {
    previewBox.classList.remove("composer__preview--visible");
  }
});

attachBtn.addEventListener("click", () => fileInput.click());

previewRemove.addEventListener("click", () => {
  fileInput.value = "";
  arquivoAtual = null;
  previewBox.classList.remove("composer__preview--visible");
});

// ===== Composer: áudio =====

const micBtn = document.getElementById("composer-mic-btn") as HTMLButtonElement;
const audioPreviewBox = document.getElementById("composer-audio-preview") as HTMLDivElement;
const audioPlayer = document.getElementById("composer-audio-player") as HTMLAudioElement;
const audioRemoveBtn = document.getElementById("composer-audio-remove") as HTMLButtonElement;

let gravacaoAtual: GravacaoConcluida | null = null;
let gravando = false;

const gravador = criarGravadorDeAudio(
  (gravacao) => {
    gravacaoAtual = gravacao;
    audioPlayer.src = gravacao.url;
    audioPreviewBox.classList.add("composer__audio-preview--visible");
  },
  () => {
    mostrarToast("Não foi possível acessar o microfone.", "erro");
    gravando = false;
    micBtn.classList.remove("composer__mic-btn--recording");
  },
);

micBtn.addEventListener("click", async () => {
  if (gravando) {
    gravador.parar();
    gravando = false;
    micBtn.classList.remove("composer__mic-btn--recording");
  } else {
    await gravador.iniciar();
    gravando = true;
    micBtn.classList.add("composer__mic-btn--recording");
  }
});

audioRemoveBtn.addEventListener("click", () => {
  gravacaoAtual = null;
  audioPreviewBox.classList.remove("composer__audio-preview--visible");
});

// ===== Composer: enviar =====

async function enviar() {
  const telefone = telefoneInput.value.trim();
  const texto = textInput.value.trim();

  if (!telefone) {
    mostrarToast("Informe o telefone de destino", "aviso");
    return;
  }

  try {
    if (gravacaoAtual) {
      const audioFile = new File([gravacaoAtual.blob], "audio.webm", { type: "audio/webm" });
      await sendMedia(telefone, audioFile, "");
      gravacaoAtual = null;
      audioPreviewBox.classList.remove("composer__audio-preview--visible");
    } else if (arquivoAtual) {
      await sendMedia(telefone, arquivoAtual.file, texto);
      fileInput.value = "";
      arquivoAtual = null;
      previewBox.classList.remove("composer__preview--visible");
    } else if (texto) {
      await sendMessage(telefone, texto);
    } else {
      return;
    }

    textInput.value = "";
    await carregarMensagens();
    await carregarListaDeContatos();
  } catch {
    mostrarToast("Falha ao enviar. Tente novamente.", "erro");
  }
}

sendBtn.addEventListener("click", enviar);
textInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") enviar();
});

// ===== Composer: localização e contato =====

const locationBtn = document.getElementById("composer-location-btn") as HTMLButtonElement;
const contactBtn = document.getElementById("composer-contact-btn") as HTMLButtonElement;

locationBtn.addEventListener("click", async () => {
  const telefone = telefoneInput.value.trim();
  if (!telefone) {
    mostrarToast("Informe o telefone de destino", "aviso");
    return;
  }

  try {
    const { latitude, longitude } = await obterLocalizacaoAtual();
    await sendLocationMessage(telefone, latitude, longitude);
  } catch {
    mostrarToast("Não foi possível obter ou enviar sua localização.", "erro");
  }
});

contactBtn.addEventListener("click", async () => {
  const telefone = telefoneInput.value.trim();
  if (!telefone) {
    mostrarToast("Informe o telefone de destino", "aviso");
    return;
  }

  const contatoNome = prompt("Nome do contato:");
  const contatoTelefone = prompt("Telefone do contato:");

  if (!contatoNome || !contatoTelefone) return;

  try {
    await sendContactMessage(telefone, contatoNome, contatoTelefone);
  } catch {
    mostrarToast("Não foi possível enviar o contato.", "erro");
  }
});

// ===== Painel CRM: perfil e tags =====

const crmNomeInput = document.getElementById("crm-nome-input") as HTMLInputElement;
const crmTelefoneDisplay = document.getElementById("crm-telefone-display") as HTMLDivElement;
const crmTagsLista = document.getElementById("crm-tags-lista") as HTMLDivElement;
const crmTagsDisponiveis = document.getElementById("crm-tags-disponiveis") as HTMLDivElement;
const crmNovaTagNome = document.getElementById("crm-nova-tag-nome") as HTMLInputElement;
const crmNovaTagCor = document.getElementById("crm-nova-tag-cor") as HTMLInputElement;
const crmNovaTagBtn = document.getElementById("crm-nova-tag-btn") as HTMLButtonElement;

let contatoAtivo: ContatoInfo | null = null;
let tagsDoContatoAtivo: TagInfo[] = [];

function renderizarTagsDoContato() {
  crmTagsLista.innerHTML = "";
  for (const tag of tagsDoContatoAtivo) {
    const el = document.createElement("span");
    el.className = "crm-tag";
    el.style.backgroundColor = tag.cor;
    el.innerHTML = `${tag.nome} <span class="crm-tag__remove" data-tag-id="${tag.id}">×</span>`;
    crmTagsLista.appendChild(el);
  }

  crmTagsLista.querySelectorAll(".crm-tag__remove").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const tagId = (e.target as HTMLElement).dataset.tagId;
      if (!tagId || !contatoAtivo) return;
      await desvincularTagDoContato(contatoAtivo.id, tagId);
      await recarregarPainelCrm();
    });
  });
}

async function renderizarTagsDisponiveis() {
  const todasTags = await listarTodasTags();
  const idsVinculadas = new Set(tagsDoContatoAtivo.map((t) => t.id));
  const disponiveis = todasTags.filter((t) => !idsVinculadas.has(t.id));

  crmTagsDisponiveis.innerHTML = "";
  for (const tag of disponiveis) {
    const el = document.createElement("span");
    el.className = "crm-tag crm-tag--disponivel";
    el.style.backgroundColor = tag.cor;
    el.textContent = `+ ${tag.nome}`;
    el.addEventListener("click", async () => {
      if (!contatoAtivo) return;
      await vincularTagAoContato(contatoAtivo.id, tag.id);
      await recarregarPainelCrm();
    });
    crmTagsDisponiveis.appendChild(el);
  }
}

// ===== Painel CRM: funil e anotações =====

const crmEtapaSelect = document.getElementById("crm-etapa-select") as HTMLSelectElement;
const crmNotasLista = document.getElementById("crm-notas-lista") as HTMLDivElement;
const crmNotaTexto = document.getElementById("crm-nota-texto") as HTMLTextAreaElement;
const crmNotaBtn = document.getElementById("crm-nota-btn") as HTMLButtonElement;

let etapasCache: EtapaInfo[] = [];

async function popularSelectDeEtapas() {
  if (etapasCache.length === 0) {
    etapasCache = await listarEtapas();
  }

  crmEtapaSelect.innerHTML = "";
  for (const etapa of etapasCache) {
    const option = document.createElement("option");
    option.value = etapa.id;
    option.textContent = etapa.nome;
    crmEtapaSelect.appendChild(option);
  }
}

async function renderizarAnotacoes() {
  if (!contatoAtivo) return;

  const anotacoes = await listarAnotacoesContato(contatoAtivo.id);
  crmNotasLista.innerHTML = "";

  for (const nota of anotacoes) {
    const el = document.createElement("div");
    el.className = "crm-nota";
    const data = new Date(nota.created_at).toLocaleString("pt-BR");
    el.innerHTML = `<div class="crm-nota__data">${data}</div>${nota.conteudo}`;
    crmNotasLista.appendChild(el);
  }
}

crmEtapaSelect.addEventListener("change", async () => {
  if (!contatoAtivo) return;
  await atualizarEtapa(contatoAtivo.id, crmEtapaSelect.value);
});

crmNotaBtn.addEventListener("click", async () => {
  if (!contatoAtivo) return;
  const conteudo = crmNotaTexto.value.trim();
  if (!conteudo) return;

  await criarAnotacaoContato(contatoAtivo.id, conteudo);
  crmNotaTexto.value = "";
  await renderizarAnotacoes();
});

// ===== Painel CRM: carregamento geral =====

async function recarregarPainelCrm() {
  const telefone = telefoneInput.value.trim();
  if (!telefone) return;

  try {
    const { contato, tags } = await carregarContato(telefone);
    contatoAtivo = contato;
    tagsDoContatoAtivo = tags;

    crmNomeInput.value = contato.nome ?? "";
    crmTelefoneDisplay.textContent = contato.telefone;

    renderizarTagsDoContato();
    await renderizarTagsDisponiveis();

    await popularSelectDeEtapas();
    if (contato.funil_etapa_id) {
      crmEtapaSelect.value = contato.funil_etapa_id;
    }

    await renderizarAnotacoes();
  } catch {
    // contato ainda não existe ou telefone inválido — silencioso
  }
}

telefoneInput.addEventListener("blur", recarregarPainelCrm);

crmNomeInput.addEventListener("blur", async () => {
  if (!contatoAtivo) return;
  await atualizarNomeContato(contatoAtivo.id, crmNomeInput.value.trim());
});

crmNovaTagBtn.addEventListener("click", async () => {
  const nome = crmNovaTagNome.value.trim();
  const cor = crmNovaTagCor.value;
  if (!nome) return;

  await criarNovaTag(nome, cor);
  crmNovaTagNome.value = "";
  await renderizarTagsDisponiveis();
});

const contactListEl = document.getElementById("contact-list") as HTMLDivElement;
const chatHeaderInfo = document.getElementById("chat-header-info") as HTMLDivElement;
const chatMessagesEl = document.getElementById("chat-messages") as HTMLDivElement;

let contatoSelecionadoId: string | null = null;
let mensagensPollTimer: ReturnType<typeof setInterval> | null = null;

async function carregarListaDeContatos() {
  try {
    const contatos = await listarContatosParaLista();
    contactListEl.innerHTML = "";

    for (const contato of contatos) {
      const el = document.createElement("div");
      el.className = "contact-item";
      if (contato.id === contatoSelecionadoId) el.classList.add("contact-item--ativo");
      el.innerHTML = `
        <span class="contact-item__nome">${contato.nome ?? contato.telefone}</span>
        <span class="contact-item__telefone">${contato.telefone}</span>
      `;
      el.addEventListener("click", () => selecionarContato(contato));
      contactListEl.appendChild(el);
    }
  } catch {
    mostrarToast("Falha ao carregar contatos", "erro");
  }
}

async function carregarMensagens() {
  if (!contatoSelecionadoId) return;

  try {
    const mensagens = await listarMensagensDoContato(contatoSelecionadoId);
    const estavaNoFim =
      chatMessagesEl.scrollHeight - chatMessagesEl.scrollTop <= chatMessagesEl.clientHeight + 50;

    chatMessagesEl.innerHTML = mensagens.map(renderizarBolha).join("");

    if (estavaNoFim) {
      chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
    }
  } catch {
    // silencioso — não vale poluir com toast a cada poll
  }
}

async function selecionarContato(contato: ContatoLista) {
  contatoSelecionadoId = contato.id;
  telefoneInput.value = contato.telefone;
  chatHeaderInfo.textContent = contato.nome ?? contato.telefone;

  await carregarListaDeContatos();
  await carregarMensagens();
  await recarregarPainelCrm();

  if (mensagensPollTimer) clearInterval(mensagensPollTimer);
  mensagensPollTimer = setInterval(carregarMensagens, 3000);
}

carregarListaDeContatos();
setInterval(carregarListaDeContatos, 10000);