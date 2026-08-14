export interface ArquivoSelecionado {
  file: File;
  previewUrl: string;
}

export function criarUploaderDeMidia(
  inputElement: HTMLInputElement,
  onArquivoSelecionado: (arquivo: ArquivoSelecionado | null) => void,
): void {
  inputElement.addEventListener("change", () => {
    const file = inputElement.files?.[0];

    if (!file) {
      onArquivoSelecionado(null);
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    onArquivoSelecionado({ file, previewUrl });
  });
}