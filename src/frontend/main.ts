import { sendMessage, sendMedia } from "./services/api.js";
import { criarUploaderDeMidia, type ArquivoSelecionado } from "./components/mediaUploader.js";
import { connectWhatsapp, getStatus, getQrCode, type SessionInfo } from "./services/api.js";

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

async function enviar() {
  const telefone = telefoneInput.value.trim();
  const texto = textInput.value.trim();

  if (!telefone) {
    alert("Informe o telefone de destino");
    return;
  }

  try {
    if (arquivoAtual) {
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
  } catch {
    alert("Falha ao enviar. Tente novamente.");
  }
}

sendBtn.addEventListener("click", enviar);
textInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") enviar();
});