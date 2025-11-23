let synth: SpeechSynthesis | null = null;

if (typeof window !== 'undefined') {
  synth = window.speechSynthesis;
}

// Global settings for TTS
let ttsSettings = {
  volume: 1.0,
  rate: 0.9,
  voiceURI: ''
};

export const configureTTS = (settings: { volume?: number; rate?: number; voiceURI?: string }) => {
  ttsSettings = { ...ttsSettings, ...settings };
};

export const getVoices = (): SpeechSynthesisVoice[] => {
  if (!synth) return [];
  return synth.getVoices().filter(v => v.lang.includes('pt'));
};

export const speak = (text: string) => {
  if (!synth) return;

  // Cancel current speech to avoid queue buildup
  if (synth.speaking) {
    synth.cancel();
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'pt-BR';
  utterance.rate = ttsSettings.rate; 
  utterance.volume = ttsSettings.volume;
  utterance.pitch = 1;
  
  const voices = getVoices();
  
  // Try to find the selected voice, otherwise fallback to default PT-BR
  if (ttsSettings.voiceURI) {
    const selectedVoice = voices.find(v => v.voiceURI === ttsSettings.voiceURI);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
  }
  
  if (!utterance.voice) {
    const ptVoice = voices.find(v => v.lang.includes('pt-BR'));
    if (ptVoice) {
      utterance.voice = ptVoice;
    }
  }

  synth.speak(utterance);
};

export const stopSpeech = () => {
  if (synth && synth.speaking) {
    synth.cancel();
  }
};