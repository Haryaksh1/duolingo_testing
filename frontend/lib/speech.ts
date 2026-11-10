/** Browser text-to-speech; silently does nothing where unsupported. */
export function speak(text: string, lang: "es" | "en" = "es", slow = false) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang === "es" ? "es-ES" : "en-US";
  utterance.rate = slow ? 0.55 : 0.9;
  const voice = synth.getVoices().find((v) => v.lang.startsWith(lang));
  if (voice) utterance.voice = voice;
  synth.speak(utterance);
}
