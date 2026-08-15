export interface GravacaoConcluida {
  blob: Blob;
  url: string;
}

export function criarGravadorDeAudio(
  onGravacaoConcluida: (gravacao: GravacaoConcluida) => void,
  onErro: (erro: Error) => void,
) {
  let mediaRecorder: MediaRecorder | null = null;
  let chunks: Blob[] = [];
  let stream: MediaStream | null = null;

  async function iniciar(): Promise<void> {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks = [];

      mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        onGravacaoConcluida({ blob, url });
        stream?.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
    } catch (err) {
      onErro(err as Error);
    }
  }

  function parar(): void {
    mediaRecorder?.stop();
  }

  function cancelar(): void {
    mediaRecorder?.stop();
    stream?.getTracks().forEach((track) => track.stop());
    chunks = [];
  }

  return { iniciar, parar, cancelar };
}