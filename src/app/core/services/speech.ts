import type { TtsSession } from '@mintplex-labs/piper-tts-web';

/**
 * Reads text aloud in French, slightly slower than normal, with a Piper neural voice running in the browser.
 * The voice model (~60 MB) downloads on first use and is kept in the browser's storage; until it is ready,
 * or if it fails, the browser's own speech synthesis is used.
 */
const VOICE_ID = 'fr_FR-siwis-medium';
const RATE = 0.75;

let session: TtsSession | null = null;
let loading: Promise<void> | null = null;
let audio: HTMLAudioElement | null = null;
/** Increments per request, so a slow synthesis does not play over a newer question. */
let request = 0;

function loadVoice(): void {
  loading ??= import('@mintplex-labs/piper-tts-web')
    .then(({ TtsSession }) => TtsSession.create({ voiceId: VOICE_ID }))
    .then((s) => {
      session = s;
    })
    .catch((e) => {
      console.warn('Piper voice unavailable, using the browser voice', e);
    });
}

export function speak(text: string): void {
  stopSpeaking();
  const current = request;
  loadVoice();
  if (!session) {
    speakWithBrowser(text);
    return;
  }
  session
    .predict(text)
    .then((wav) => {
      if (current !== request) {
        return;
      }
      audio ??= new Audio();
      URL.revokeObjectURL(audio.src);
      audio.src = URL.createObjectURL(wav);
      audio.playbackRate = RATE;
      audio.preservesPitch = true;
      return audio.play();
    })
    .catch(() => {
      if (current === request) {
        speakWithBrowser(text);
      }
    });
}

export function stopSpeaking(): void {
  request++;
  audio?.pause();
  if ('speechSynthesis' in window) {
    speechSynthesis.cancel();
  }
}

function speakWithBrowser(text: string): void {
  if (!('speechSynthesis' in window)) {
    return;
  }
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'fr-FR';
  utterance.rate = RATE;
  speechSynthesis.speak(utterance);
}
