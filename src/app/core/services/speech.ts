/** Reads text aloud in French, slightly slower than normal; does nothing without browser support. */
export function speak(text: string): void {
  if (!('speechSynthesis' in window)) {
    return;
  }
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'fr-FR';
  utterance.rate = 0.85;
  speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if ('speechSynthesis' in window) {
    speechSynthesis.cancel();
  }
}
