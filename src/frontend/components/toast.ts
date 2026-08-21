export type ToastTipo = "erro" | "aviso" | "sucesso";

export function mostrarToast(mensagem: string, tipo: ToastTipo = "erro"): void {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast toast--${tipo}`;
  toast.textContent = mensagem;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("toast--saindo");
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}