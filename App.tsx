import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AppView, GameQuestion, GameLevel } from './types';
import { speak, stopSpeech, configureTTS, getVoices } from './services/tts';
import { analyzeImageText, askAssistant, checkWriting, generateLiteracyGame } from './services/gemini';
import { VoiceButton } from './components/VoiceButton';
import { 
  Camera, 
  Image as ImageIcon, 
  Pencil, 
  Bot, 
  ArrowLeft, 
  RefreshCw, 
  Mic,
  CheckCircle2,
  XCircle,
  Volume2,
  History,
  GraduationCap,
  Settings,
  Type,
  CaseLower,
  Ear,
  Puzzle,
  BookOpen,
  AlignLeft,
  FileText,
  Library,
  Lock,
  Moon,
  Sun,
  Eye,
  PlayCircle,
  Palette,
  MicOff,
  Rabbit,
  Turtle,
  User,
  Trash2,
  Unlock,
  Home,
  Star
} from 'lucide-react';

// --- CONSTANTS ---

const QUESTIONS_PER_LEVEL = 7;

const LEVELS: GameLevel[] = [
  {
    id: 1,
    subtitle: "Nível 1",
    title: "Alfabeto",
    description: "Caça-Letras Interativo. Identificar a letra inicial.",
    icon: "Type",
    promptContext: `
    ATIVIDADE: Nível 1 - Alfabeto.
    PERGUNTA: "Qual é a primeira letra da palavra [PALAVRA]?"
    OPÇÕES: 3 letras (1 correta).
    `,
    isLocked: false
  },
  {
    id: 2,
    subtitle: "Nível 2",
    title: "Vogais",
    description: "Bingo Sonoro. Identificar vogais.",
    icon: "CaseLower",
    promptContext: `
    ATIVIDADE: Nível 2 - Vogais.
    PERGUNTA: "Qual vogal falta em: P _ T O (Pato)?"
    OPÇÕES: 3 vogais.
    `,
    isLocked: true
  },
  {
    id: 3,
    subtitle: "Nível 3",
    title: "Fonemas",
    description: "Sons das palavras.",
    icon: "Ear",
    promptContext: `
    ATIVIDADE: Nível 3 - Fonemas.
    PERGUNTA: "Qual palavra começa com o som /som/?"
    OPÇÕES: 3 palavras.
    `,
    isLocked: true
  },
  {
    id: 4,
    subtitle: "Nível 4",
    title: "Sílabas",
    description: "Contar sílabas.",
    icon: "Puzzle",
    promptContext: `
    ATIVIDADE: Nível 4 - Sílabas.
    PERGUNTA: "Quantas sílabas tem a palavra [PALAVRA]?"
    OPÇÕES: Números.
    `,
    isLocked: true
  },
  {
    id: 5,
    subtitle: "Nível 5",
    title: "Palavras",
    description: "Ortografia correta.",
    icon: "BookOpen",
    promptContext: `
    ATIVIDADE: Nível 5 - Palavras.
    PERGUNTA: "Qual é a escrita correta?"
    OPÇÕES: 1 correta, 2 erradas.
    `,
    isLocked: true
  },
  {
    id: 6,
    subtitle: "Nível 6",
    title: "Frases",
    description: "Organizar frases.",
    icon: "AlignLeft",
    promptContext: `
    ATIVIDADE: Nível 6 - Frases.
    PERGUNTA: "Qual a ordem certa das palavras?"
    OPÇÕES: 3 ordens.
    `,
    isLocked: true
  },
  {
    id: 7,
    subtitle: "Nível 7",
    title: "Textos",
    description: "Interpretação rápida.",
    icon: "FileText",
    promptContext: `
    ATIVIDADE: Nível 7 - Leitura.
    PERGUNTA: Pergunta simples sobre um texto curto.
    OPÇÕES: 3 respostas.
    `,
    isLocked: true
  },
  {
    id: 8,
    subtitle: "Nível 8",
    title: "Histórias",
    description: "Continuar a história.",
    icon: "Library",
    promptContext: `
    ATIVIDADE: Nível 8 - Narrativa.
    PERGUNTA: "O que acontece depois?"
    OPÇÕES: 3 finais.
    `,
    isLocked: true
  }
];

const ICON_MAP: Record<string, React.FC<any>> = {
  Type, CaseLower, Ear, Puzzle, BookOpen, AlignLeft, FileText, Library
};

// --- SETTINGS TYPES ---
interface AppSettings {
  // Audio
  volume: number; // 0 to 1
  speechRate: number; // 0.5 to 1.5
  voiceURI: string;
  autoRepeat: boolean;
  // Visual
  fontSize: 'small' | 'medium' | 'large';
  fontType: 'lexend' | 'sans' | 'serif' | 'dyslexic';
  theme: 'light' | 'dark' | 'contrast';
  highlightColor: string;
  showCaptions: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  volume: 1.0,
  speechRate: 1.0,
  voiceURI: '',
  autoRepeat: false,
  fontSize: 'medium',
  fontType: 'lexend',
  theme: 'light',
  highlightColor: 'bg-yellow-200',
  showCaptions: true
};

// --- HELPER COMPONENTS ---

const Header = ({ title, onBack, subtitle }: { title: string, onBack?: () => void, subtitle?: string }) => (
  <div className="sticky top-0 z-10 bg-opacity-95 backdrop-blur-sm p-4 flex items-center gap-4 border-b border-inherit shadow-sm transition-colors duration-300">
    {onBack ? (
      <VoiceButton 
        voiceLabel="Voltar" 
        variant="icon" 
        onClick={onBack}
      >
        <ArrowLeft size={32} strokeWidth={3} />
      </VoiceButton>
    ) : (
       <div className="w-12"></div> 
    )}
    <div className="flex-1 text-center">
      <h1 className={`text-2xl md:text-3xl font-black text-inherit tracking-tight ${subtitle ? 'leading-none' : ''}`}>{title}</h1>
      {subtitle && <p className="text-sm opacity-70 mt-1 font-bold tracking-wide uppercase">{subtitle}</p>}
    </div>
    <div className="w-12">
       {!onBack && <Bot className="opacity-20 mx-auto" size={32}/>}
    </div>
  </div>
);

// --- MAIN APP COMPONENT ---

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>(AppView.HOME);
  const [loading, setLoading] = useState(false);
  
  // Settings State
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Progress State
  const [maxUnlockedLevel, setMaxUnlockedLevel] = useState(1);

  // Game Session State
  const [activeLevel, setActiveLevel] = useState<GameLevel | null>(null);
  const [gameQuestion, setGameQuestion] = useState<GameQuestion | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(1); // 1 to 7
  const [gameStatus, setGameStatus] = useState<'loading' | 'waiting' | 'success' | 'error'>('loading');
  const [feedbackMessage, setFeedbackMessage] = useState("");

  // Assistant Chat State
  const [chatHistory, setChatHistory] = useState<{role: 'user'|'model', text: string}[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Camera/Writing State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [ocrResult, setOcrResult] = useState<string>("");
  const [writingText, setWritingText] = useState("");
  const [writingResult, setWritingResult] = useState<{corrected: string, changes: string[], feedback: string} | null>(null);

  // Load settings and progress on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('dizai_settings');
    if (savedSettings) {
      try { setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) }); } catch(e) {}
    }

    const savedProgress = localStorage.getItem('dizai_level_progress');
    if (savedProgress) {
        try { setMaxUnlockedLevel(parseInt(savedProgress, 10)); } catch(e) {}
    }

    const loadVoices = () => {
        const voices = getVoices();
        setAvailableVoices(voices);
    };
    loadVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  useEffect(() => {
    configureTTS({
        volume: settings.volume,
        rate: settings.speechRate,
        voiceURI: settings.voiceURI
    });
    localStorage.setItem('dizai_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
     localStorage.setItem('dizai_level_progress', maxUnlockedLevel.toString());
  }, [maxUnlockedLevel]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const navigateTo = (view: AppView, message: string) => {
    stopSpeech();
    setCurrentView(view);
    speak(message);
    
    // Reset states when leaving views
    if (view !== AppView.GAMES) {
        setActiveLevel(null);
        setGameQuestion(null);
    }
    if (view !== AppView.ASSISTANT) {
        setChatHistory([]); // Optional: keep history or clear
    }
    if (view !== AppView.WRITING) {
        setWritingResult(null);
        setWritingText("");
    }
  };

  // Theme & Style Classes
  const getThemeClasses = () => {
    if (settings.theme === 'contrast') return 'bg-black text-yellow-300 border-yellow-300';
    if (settings.theme === 'dark') return 'bg-slate-900 text-white border-slate-700';
    return 'bg-slate-50 text-slate-900 border-slate-200';
  };

  const getFontClass = () => {
      if (settings.fontType === 'serif') return 'font-serif';
      if (settings.fontType === 'sans') return 'font-sans';
      if (settings.fontType === 'dyslexic') return 'font-mono tracking-widest';
      return 'font-[Lexend]';
  };

  const getFontSizeClass = () => {
      if (settings.fontSize === 'small') return 'text-base';
      if (settings.fontSize === 'large') return 'text-2xl';
      return 'text-lg';
  };

  const themeClass = getThemeClasses();
  const fontClass = getFontClass();
  const sizeClass = getFontSizeClass();

  // --- LOGIC: GAMES ---

  const startGameSession = async (level: GameLevel, isNextQuestion: boolean = false) => {
      if (!isNextQuestion) {
        setActiveLevel(level);
        setCurrentQuestionIndex(1);
        speak(`Iniciando ${level.title}. Atividade 1 de ${QUESTIONS_PER_LEVEL}.`);
      } else {
        speak(`Atividade ${currentQuestionIndex + 1}.`); // It will be incremented in state before next render, but safe to say here
      }

      setGameStatus('loading');
      setGameQuestion(null);
      setFeedbackMessage("");
      
      const question = await generateLiteracyGame(level.promptContext);
      setGameQuestion(question);
      setGameStatus('waiting');
      speak(question.question);
      
      // Read options quickly - optimized for speed
      setTimeout(() => {
          question.options.forEach((opt: string, i: number) => {
              setTimeout(() => speak(opt), i * 1000); // Start immediately (0), then 1s intervals
          });
      }, 500); // Minimal initial delay
  };

  const handleGameAnswer = (selectedOption: string) => {
      if (!gameQuestion || !activeLevel) return;

      if (selectedOption === gameQuestion.correctAnswer) {
          // Correct
          setGameStatus('success');
          
          if (currentQuestionIndex < QUESTIONS_PER_LEVEL) {
            // Intermediate Success
            setFeedbackMessage(gameQuestion.explanation || "Muito bem! Vamos para a próxima.");
            speak("Correto! " + (gameQuestion.explanation || "Muito bem!"));
          } else {
            // Level Completed (7/7)
            const isFinalLevel = activeLevel.id === LEVELS.length;
            
            if (activeLevel.id === maxUnlockedLevel && !isFinalLevel) {
                const nextLevel = maxUnlockedLevel + 1;
                setMaxUnlockedLevel(nextLevel);
                setFeedbackMessage("Parabéns! Nível Concluído e Próximo Desbloqueado!");
                speak(`Parabéns! Você completou as 7 atividades. Nível ${nextLevel} desbloqueado!`);
            } else {
                setFeedbackMessage("Parabéns! Você completou este nível!");
                speak("Parabéns! Você completou todas as atividades deste nível!");
            }
          }
      } else {
          // Incorrect
          setGameStatus('error');
          setFeedbackMessage("Não foi dessa vez. Tente novamente!");
          speak("Não foi dessa vez. Tente outra opção.");
      }
  };

  const nextQuestion = () => {
      if (activeLevel) {
          const nextIndex = currentQuestionIndex + 1;
          setCurrentQuestionIndex(nextIndex);
          startGameSession(activeLevel, true);
      }
  };

  // --- LOGIC: CAMERA ---
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          setLoading(true);
          speak("Analisando imagem. Aguarde.");
          const reader = new FileReader();
          reader.onloadend = async () => {
              const base64 = reader.result as string;
              const base64Data = base64.split(',')[1];
              const text = await analyzeImageText(base64Data);
              setOcrResult(text);
              setLoading(false);
              speak("Li o seguinte: " + text);
          };
          reader.readAsDataURL(file);
      }
  };

  // --- VIEW: HOME ---
  const renderHome = () => (
    <div className={`p-6 flex flex-col min-h-screen max-w-md mx-auto transition-colors duration-300 ${themeClass} ${fontClass} ${sizeClass}`}>
      {/* Top Bar */}
      <div className="flex justify-between items-center mb-4">
         <div className="flex items-center gap-2 opacity-60">
             <div className="h-2 w-24 bg-slate-200 rounded-full overflow-hidden">
                 <div className="h-full bg-green-500" style={{ width: `${(maxUnlockedLevel/LEVELS.length)*100}%` }}></div>
             </div>
         </div>
        <VoiceButton 
            voiceLabel="Configurações" 
            variant="icon" 
            onClick={() => navigateTo(AppView.SETTINGS, "Configurações")}
            className={settings.theme === 'contrast' ? 'text-yellow-300' : 'text-slate-700'}
        >
            <Settings size={32} />
        </VoiceButton>
      </div>

      {/* Logo Area */}
      <div className="flex flex-col items-center mb-8 mt-4">
        <div className="flex items-center gap-3 mb-2">
           <div className={`p-4 rounded-2xl ${settings.theme === 'contrast' ? 'bg-yellow-400 text-black' : 'bg-teal-600 text-white shadow-lg shadow-teal-200'}`}>
              <Bot size={48} />
           </div>
           <h1 className="text-5xl font-black tracking-tighter">Diz Aí</h1>
        </div>
        <p className="text-sm font-black tracking-[0.3em] opacity-60 uppercase">Aprenda Lendo</p>
      </div>

      {/* Grid Menu */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <VoiceButton 
          voiceLabel="Fotos. Ler com a câmera."
          onClick={() => navigateTo(AppView.CAMERA, "Abrindo câmera")}
          variant="card"
          customColorClass={settings.theme === 'contrast' ? 'bg-black border-yellow-400 text-yellow-400' : "bg-red-50 border-red-100 text-red-600 hover:bg-red-100"}
        >
          <div className={`p-4 rounded-full mb-3 ${settings.theme === 'contrast' ? 'bg-yellow-400 text-black' : 'bg-white'}`}>
            <Camera size={32} />
          </div>
          <span className="text-lg font-black tracking-wide">FOTOS</span>
        </VoiceButton>

        <VoiceButton 
          voiceLabel="Álbum. Escolher foto."
          onClick={() => navigateTo(AppView.GALLERY, "Abrindo galeria")}
          variant="card"
          customColorClass={settings.theme === 'contrast' ? 'bg-black border-yellow-400 text-yellow-400' : "bg-blue-50 border-blue-100 text-blue-600 hover:bg-blue-100"}
        >
          <div className={`p-4 rounded-full mb-3 ${settings.theme === 'contrast' ? 'bg-yellow-400 text-black' : 'bg-white'}`}>
            <ImageIcon size={32} />
          </div>
          <span className="text-lg font-black tracking-wide">ALBUM</span>
        </VoiceButton>

        <VoiceButton 
          voiceLabel="Escrita. Praticar palavras."
          onClick={() => navigateTo(AppView.WRITING, "Vamos escrever")}
          variant="card"
          customColorClass={settings.theme === 'contrast' ? 'bg-black border-yellow-400 text-yellow-400' : "bg-purple-50 border-purple-100 text-purple-600 hover:bg-purple-100"}
        >
          <div className={`p-4 rounded-full mb-3 ${settings.theme === 'contrast' ? 'bg-yellow-400 text-black' : 'bg-white'}`}>
            <Pencil size={32} />
          </div>
          <span className="text-lg font-black tracking-wide">ESCRITA</span>
        </VoiceButton>

        <VoiceButton 
          voiceLabel="Atividades. Jogos de leitura."
          onClick={() => navigateTo(AppView.GAMES, "Atividades e Jogos")}
          variant="card"
          customColorClass={settings.theme === 'contrast' ? 'bg-black border-yellow-400 text-yellow-400' : "bg-amber-50 border-amber-100 text-amber-600 hover:bg-amber-100"}
        >
          <div className={`p-4 rounded-full mb-3 ${settings.theme === 'contrast' ? 'bg-yellow-400 text-black' : 'bg-white'}`}>
            <GraduationCap size={32} />
          </div>
          <span className="text-lg font-black tracking-wide">ATIVIDADE</span>
        </VoiceButton>
      </div>

      {/* Assistant Button */}
      <VoiceButton 
        voiceLabel="Assistente. Converse comigo."
        onClick={() => navigateTo(AppView.ASSISTANT, "Assistente.")}
        className={`mt-auto w-full py-6 rounded-3xl flex items-center justify-center gap-5 shadow-xl border-b-8 active:border-b-0 active:translate-y-2 transition-all
            ${settings.theme === 'contrast' 
                ? 'bg-yellow-400 border-yellow-600 text-black' 
                : 'bg-indigo-600 border-indigo-800 text-white hover:bg-indigo-700'}
        `}
      >
         <Bot size={40} />
         <div className="flex flex-col items-start">
            <span className="text-2xl font-black tracking-wider uppercase">Assistente</span>
            <span className="text-xs font-bold opacity-90">Toque para conversar</span>
         </div>
      </VoiceButton>
    </div>
  );

  // --- VIEW: GAMES (LEVEL SELECTOR) ---
  const renderGames = () => (
      <div className={`min-h-screen flex flex-col ${themeClass} ${fontClass} ${sizeClass}`}>
        <Header title="Atividades" onBack={() => navigateTo(AppView.HOME, "Menu inicial")} subtitle={`${maxUnlockedLevel} de ${LEVELS.length} Desbloqueados`} />
        
        <div className="p-6 grid gap-4 overflow-y-auto pb-20">
            {LEVELS.map((level) => {
                const isLocked = level.id > maxUnlockedLevel;
                const Icon = ICON_MAP[level.icon] || GraduationCap;
                
                return (
                    <button
                        key={level.id}
                        onClick={() => {
                            if (!isLocked) {
                                startGameSession(level);
                            } else {
                                speak("Bloqueado. Termine o nível anterior.");
                            }
                        }}
                        className={`
                            relative w-full text-left p-5 rounded-3xl border-b-4 transition-all flex items-center gap-5
                            ${isLocked 
                                ? 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed grayscale' 
                                : settings.theme === 'contrast'
                                    ? 'bg-black border-yellow-400 text-yellow-400 hover:bg-slate-900'
                                    : 'bg-white border-slate-200 text-slate-800 hover:border-blue-300 hover:shadow-md active:translate-y-1 active:border-b-0'
                            }
                        `}
                    >
                        <div className={`
                            w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black shadow-sm
                            ${isLocked 
                                ? 'bg-slate-300 text-white' 
                                : settings.theme === 'contrast' ? 'bg-yellow-400 text-black' : 'bg-blue-100 text-blue-600'
                            }
                        `}>
                            {isLocked ? <Lock size={28} /> : <Icon size={32} />}
                        </div>
                        
                        <div className="flex-1">
                            <div className="flex justify-end items-center mb-1">
                                {level.subtitle && <span className="text-xs font-black uppercase tracking-wider opacity-50 mr-auto">{level.subtitle}</span>}
                                {level.id < maxUnlockedLevel && <CheckCircle2 size={20} className="text-green-500" />}
                                {level.id === maxUnlockedLevel && !isLocked && <div className="text-xs font-bold text-blue-500 bg-blue-100 px-2 py-0.5 rounded-md">ATUAL</div>}
                            </div>
                            <h3 className="text-xl font-black leading-tight">{level.title}</h3>
                            <p className="text-sm opacity-70 font-medium leading-snug mt-1 line-clamp-2">{level.description}</p>
                        </div>
                    </button>
                );
            })}
        </div>
      </div>
  );

  // --- VIEW: ACTIVE GAME SESSION ---
  const renderGameSession = () => {
      if (!activeLevel) return null;

      const nextLevel = LEVELS.find(l => l.id === activeLevel.id + 1);
      const isLevelFinished = gameStatus === 'success' && currentQuestionIndex >= QUESTIONS_PER_LEVEL;

      return (
        <div className={`min-h-screen flex flex-col ${themeClass} ${fontClass} ${sizeClass}`}>
            <Header title={activeLevel.title} onBack={() => {
                setActiveLevel(null);
                navigateTo(AppView.GAMES, "Voltando para lista");
            }} subtitle={activeLevel.subtitle} />

            <div className="flex-1 p-6 flex flex-col items-center max-w-2xl mx-auto w-full">
                
                {gameStatus === 'loading' && (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4 opacity-50 animate-pulse">
                        <RefreshCw size={64} className="animate-spin" />
                        <p className="text-xl font-bold">Criando atividade...</p>
                    </div>
                )}

                {gameQuestion && (
                    <>
                        <div className={`w-full p-6 rounded-3xl mb-8 text-center shadow-sm border-2 ${settings.theme === 'contrast' ? 'bg-black border-yellow-400' : 'bg-white border-blue-100'}`}>
                            <button onClick={() => speak(gameQuestion.question)} className="mx-auto p-3 rounded-full bg-slate-100 hover:bg-slate-200 mb-4 text-slate-700">
                                <Volume2 size={32} />
                            </button>
                            <h2 className="text-2xl font-black leading-snug">{gameQuestion.question}</h2>
                        </div>

                        <div className="w-full grid gap-4 mb-6">
                            {gameQuestion.options.map((option, idx) => {
                                const isCorrect = option === gameQuestion.correctAnswer;
                                const showResult = gameStatus !== 'waiting';
                                let btnClass = settings.theme === 'contrast' ? 'bg-slate-900 border-yellow-900 hover:bg-slate-800' : 'bg-white border-slate-200 hover:border-blue-300';
                                
                                if (showResult) {
                                    if (isCorrect) btnClass = 'bg-green-100 border-green-500 text-green-800';
                                    else if (gameStatus === 'error') btnClass = 'bg-red-50 border-red-200 text-red-300 opacity-50';
                                }

                                return (
                                    <button
                                        key={idx}
                                        disabled={gameStatus !== 'waiting'}
                                        onClick={() => handleGameAnswer(option)}
                                        className={`
                                            w-full p-6 rounded-2xl border-b-4 text-left font-bold text-xl transition-all active:scale-95
                                            ${btnClass}
                                        `}
                                    >
                                        {option}
                                    </button>
                                );
                            })}
                        </div>

                        {gameStatus !== 'waiting' && (
                            <div className={`w-full p-6 rounded-2xl mb-20 animate-in slide-in-from-bottom-10 fade-in
                                ${gameStatus === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}
                            `}>
                                <div className="flex items-start gap-4">
                                    {gameStatus === 'success' ? <CheckCircle2 size={40} className="shrink-0" /> : <XCircle size={40} className="shrink-0" />}
                                    <div>
                                        <p className="text-lg font-black mb-1">{gameStatus === 'success' ? "Acertou!" : "Ops!"}</p>
                                        <p className="text-lg leading-snug">{feedbackMessage}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Bottom Action Bar */}
            {gameStatus !== 'loading' && (
                <div className={`fixed bottom-0 left-0 right-0 p-4 ${settings.theme === 'contrast' ? 'bg-black border-t border-yellow-400' : 'bg-white border-t border-slate-200'}`}>
                    <div className="max-w-md mx-auto flex gap-4">
                        <VoiceButton 
                            voiceLabel="Ouvir novamente"
                            variant="secondary"
                            className="flex-1"
                            onClick={() => gameQuestion && speak(gameQuestion.question)}
                        >
                            <Volume2 />
                        </VoiceButton>
                        
                        {gameStatus !== 'waiting' && (
                            <VoiceButton 
                                voiceLabel={isLevelFinished ? "Concluir Nível" : "Próximo Desafio"}
                                variant="action"
                                className="flex-[2]"
                                onClick={() => {
                                    if (isLevelFinished) {
                                        setActiveLevel(null);
                                        navigateTo(AppView.GAMES, "Nível concluído! Parabéns!");
                                    } else if (gameStatus === 'success') {
                                        nextQuestion();
                                    } else {
                                        // Retry logic (optional, currently we just let them try clicking options again, 
                                        // but if they are stuck we can offer 'next' or reload)
                                        speak("Tente selecionar a opção correta.");
                                    }
                                }}
                            >
                                {isLevelFinished ? (
                                    <>Concluir <Star className="ml-2 fill-current" /></>
                                ) : (
                                    <>Continuar <ArrowLeft className="rotate-180 ml-2" /></>
                                )}
                            </VoiceButton>
                        )}
                    </div>
                </div>
            )}
        </div>
      );
  };

  // --- VIEW: SETTINGS ---
  const renderSettings = () => {
    const sectionTitleClass = `text-lg font-black uppercase tracking-widest mb-4 mt-8 border-b-2 pb-2 ${settings.theme === 'contrast' ? 'text-yellow-400 border-yellow-400' : 'text-slate-400 border-slate-200'}`;
    const cardClass = `p-5 rounded-3xl border-b-4 flex flex-col gap-4 shadow-sm ${settings.theme === 'contrast' ? 'bg-slate-900 border-yellow-900' : 'bg-white border-slate-200'}`;

    return (
        <div className={`min-h-screen flex flex-col ${themeClass} ${fontClass} ${sizeClass}`}>
            <Header title="Configurações" onBack={() => navigateTo(AppView.HOME, "Salvando")} />
            
            <div className="flex-1 p-6 overflow-y-auto max-w-lg mx-auto w-full pb-20">
                
                {/* AUDIO SECTION */}
                <h3 className={sectionTitleClass}>Áudio e Voz</h3>
                
                {/* Volume */}
                <div className={cardClass}>
                    <div className="flex items-center justify-between">
                         <label className="font-black flex items-center gap-3 text-xl"><Volume2 size={28}/> Volume</label>
                         <span className="font-mono font-bold bg-slate-100 px-3 py-1 rounded-lg text-slate-900 border">{Math.round(settings.volume * 100)}%</span>
                    </div>
                    <input 
                        type="range" min="0" max="1" step="0.1"
                        value={settings.volume}
                        onChange={(e) => setSettings({...settings, volume: parseFloat(e.target.value)})}
                        className="w-full h-6 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600 mt-2"
                    />
                </div>

                {/* Speed */}
                <div className={cardClass}>
                    <label className="font-black flex items-center gap-3 text-xl"><Rabbit size={28}/> Velocidade</label>
                    <div className="flex gap-2 mt-2">
                        {[
                            { label: 'Lento', val: 0.5, icon: Turtle }, 
                            { label: 'Normal', val: 1.0, icon: User }, 
                            { label: 'Rápido', val: 1.5, icon: Rabbit }
                        ].map((opt) => (
                            <button 
                                key={opt.label}
                                onClick={() => {
                                    setSettings({...settings, speechRate: opt.val});
                                    speak("Teste de velocidade");
                                }}
                                className={`flex-1 py-3 rounded-xl font-black text-sm border-b-4 active:border-b-0 active:translate-y-1 transition-all flex flex-col items-center gap-2
                                    ${settings.speechRate === opt.val 
                                        ? (settings.theme === 'contrast' ? 'bg-yellow-400 text-black border-yellow-600' : 'bg-blue-600 text-white border-blue-800')
                                        : 'bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200'
                                    }`}
                            >
                                <opt.icon size={20} />
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Voice */}
                <div className={cardClass}>
                    <label className="font-black flex items-center gap-3 text-xl"><Bot size={28}/> Tipo de Voz</label>
                    <div className="relative">
                        <select 
                            value={settings.voiceURI}
                            onChange={(e) => {
                                setSettings({...settings, voiceURI: e.target.value});
                                setTimeout(() => speak("Minha nova voz é esta."), 200);
                            }}
                            className={`w-full p-4 rounded-xl border-2 font-bold appearance-none ${settings.theme === 'contrast' ? 'bg-black border-yellow-400 text-yellow-400' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                        >
                            {availableVoices.length === 0 && <option value="">Padrão do Sistema</option>}
                            {availableVoices.map(v => (
                                <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>
                            ))}
                        </select>
                    </div>
                </div>


                {/* VISUAL SECTION */}
                <h3 className={sectionTitleClass}>Visual</h3>

                {/* Font Size */}
                <div className={cardClass}>
                    <label className="font-black flex items-center gap-3 text-xl"><Type size={28}/> Tamanho</label>
                    <div className="flex gap-2 items-end mt-2">
                         <button onClick={() => setSettings({...settings, fontSize: 'small'})} className={`p-3 border-2 rounded-xl flex-1 font-bold ${settings.fontSize === 'small' ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200'}`}>A-</button>
                         <button onClick={() => setSettings({...settings, fontSize: 'medium'})} className={`p-4 border-2 rounded-xl flex-1 font-black text-xl ${settings.fontSize === 'medium' ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200'}`}>A</button>
                         <button onClick={() => setSettings({...settings, fontSize: 'large'})} className={`p-5 border-2 rounded-xl flex-1 font-black text-2xl ${settings.fontSize === 'large' ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200'}`}>A+</button>
                    </div>
                </div>

                {/* Theme */}
                <div className={cardClass}>
                    <label className="font-black flex items-center gap-3 text-xl"><Palette size={28}/> Cores</label>
                    <div className="flex gap-2 mt-2">
                        <button onClick={() => setSettings({...settings, theme: 'light'})} className={`flex-1 p-4 rounded-xl border-2 font-bold flex flex-col items-center gap-2 ${settings.theme === 'light' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200'}`}>
                            <Sun size={24} /> Claro
                        </button>
                        <button onClick={() => setSettings({...settings, theme: 'contrast'})} className={`flex-1 p-4 rounded-xl border-2 font-bold flex flex-col items-center gap-2 ${settings.theme === 'contrast' ? 'border-yellow-400 bg-black text-yellow-400' : 'border-slate-200 bg-slate-900 text-slate-400'}`}>
                            <Eye size={24} /> Contraste
                        </button>
                    </div>
                </div>

                {/* PROGRESS */}
                <h3 className={sectionTitleClass}>Progresso</h3>
                <div className={cardClass}>
                     <div className="flex items-center justify-between">
                        <div>
                            <label className="font-black text-xl">Níveis</label>
                            <p className="text-sm opacity-70">Você está no nível {maxUnlockedLevel} de {LEVELS.length}.</p>
                        </div>
                        <button 
                            onClick={() => {
                                if (confirm("Tem certeza que deseja reiniciar todo o progresso dos níveis?")) {
                                    setMaxUnlockedLevel(1);
                                    speak("Progresso reiniciado.");
                                }
                            }}
                            className="p-3 text-red-500 bg-red-50 rounded-xl hover:bg-red-100"
                        >
                            <Trash2 size={24} />
                        </button>
                     </div>
                </div>

            </div>
        </div>
    );
  };

  // --- VIEW: CAMERA ---
  const renderCamera = () => (
      <div className={`min-h-screen flex flex-col ${themeClass} ${fontClass} ${sizeClass}`}>
        <Header title="Câmera" onBack={() => navigateTo(AppView.HOME, "Menu inicial")} />
        
        <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
            {!ocrResult ? (
                <>
                    <div className={`w-64 h-64 rounded-full flex items-center justify-center mb-8 border-4 border-dashed ${settings.theme === 'contrast' ? 'border-yellow-400 bg-slate-900' : 'border-slate-300 bg-slate-100'}`}>
                        {loading ? <RefreshCw size={64} className="animate-spin opacity-50" /> : <Camera size={80} className="opacity-30" />}
                    </div>
                    
                    <p className="text-xl font-bold mb-8 max-w-xs mx-auto">
                        Tire uma foto de um texto para eu ler para você.
                    </p>

                    <label className={`
                        w-full py-6 rounded-2xl shadow-lg text-xl font-black cursor-pointer flex items-center justify-center gap-3 transition-transform active:scale-95
                        ${settings.theme === 'contrast' ? 'bg-yellow-400 text-black' : 'bg-blue-600 text-white hover:bg-blue-700'}
                    `}>
                        <Camera size={32} />
                        ABRIR CÂMERA
                        <input 
                            ref={fileInputRef}
                            type="file" 
                            accept="image/*" 
                            capture="environment"
                            className="hidden"
                            onChange={handleImageUpload}
                        />
                    </label>
                </>
            ) : (
                <div className="flex-1 w-full flex flex-col">
                    <div className={`flex-1 p-6 rounded-2xl text-left mb-6 overflow-y-auto text-2xl leading-relaxed font-medium border-2 ${settings.theme === 'contrast' ? 'bg-black border-yellow-400' : 'bg-white border-slate-200'}`}>
                        {ocrResult}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <VoiceButton voiceLabel="Ouvir texto" variant="primary" onClick={() => speak(ocrResult)}>
                            <Volume2 size={24} className="mr-2" /> Ouvir
                        </VoiceButton>
                        <VoiceButton voiceLabel="Tentar outra foto" variant="secondary" onClick={() => { setOcrResult(""); setOcrResult(""); }}>
                            <RefreshCw size={24} className="mr-2" /> Nova Foto
                        </VoiceButton>
                    </div>
                </div>
            )}
        </div>
      </div>
  );

  // --- VIEW: GALLERY (Simpler version of Camera) ---
  const renderGallery = () => (
    <div className={`min-h-screen flex flex-col ${themeClass} ${fontClass} ${sizeClass}`}>
        <Header title="Galeria" onBack={() => navigateTo(AppView.HOME, "Menu inicial")} />
        <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
             {!ocrResult ? (
                <>
                    <ImageIcon size={100} className="opacity-20 mb-6" />
                    <p className="text-xl font-bold mb-8">Escolha uma imagem do seu celular.</p>
                    <label className={`w-full py-6 rounded-2xl text-xl font-black cursor-pointer flex items-center justify-center gap-3 ${settings.theme === 'contrast' ? 'bg-yellow-400 text-black' : 'bg-blue-600 text-white'}`}>
                        <ImageIcon size={32} />
                        ESCOLHER FOTO
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                </>
             ) : (
                <div className="flex-1 w-full flex flex-col">
                    <div className={`flex-1 p-6 rounded-2xl text-left mb-6 overflow-y-auto text-2xl leading-relaxed border-2 ${settings.theme === 'contrast' ? 'bg-black border-yellow-400' : 'bg-white border-slate-200'}`}>
                        {ocrResult}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <VoiceButton voiceLabel="Ouvir" variant="primary" onClick={() => speak(ocrResult)}><Volume2 className="mr-2" /> Ouvir</VoiceButton>
                        <VoiceButton voiceLabel="Outra" variant="secondary" onClick={() => setOcrResult("")}><RefreshCw className="mr-2" /> Outra</VoiceButton>
                    </div>
                </div>
             )}
        </div>
    </div>
  );

  // --- VIEW: WRITING ---
  const renderWriting = () => (
      <div className={`min-h-screen flex flex-col ${themeClass} ${fontClass} ${sizeClass}`}>
         <Header title="Escrita" onBack={() => navigateTo(AppView.HOME, "Menu inicial")} />
         <div className="flex-1 p-6 flex flex-col max-w-md mx-auto w-full">
            
            <div className={`p-6 rounded-3xl mb-4 border-2 flex-1 flex flex-col relative ${settings.theme === 'contrast' ? 'bg-black border-yellow-400' : 'bg-white border-purple-100'}`}>
                <label className="block text-sm font-black opacity-50 uppercase tracking-wider mb-2">Seu texto:</label>
                <textarea 
                    value={writingText}
                    onChange={(e) => setWritingText(e.target.value)}
                    placeholder="Escreva aqui..."
                    className={`w-full flex-1 bg-transparent text-2xl font-bold outline-none resize-none placeholder:opacity-30 ${settings.theme === 'contrast' ? 'text-yellow-400' : 'text-slate-800'}`}
                />
                <button 
                    onClick={() => speak(writingText || "Escreva algo primeiro")} 
                    className="absolute bottom-4 right-4 p-3 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                    aria-label="Ler texto"
                >
                    <Volume2 size={24} />
                </button>
            </div>

            {writingResult && (
                <div className={`p-6 rounded-3xl mb-6 border-2 animate-in fade-in slide-in-from-bottom-4 ${settings.theme === 'contrast' ? 'bg-slate-900 border-green-400 text-white' : 'bg-green-50 border-green-200 text-slate-800'}`}>
                    <div className="flex items-center gap-3 mb-4 text-green-600">
                        <CheckCircle2 size={32} />
                        <h3 className="font-black text-xl">Correção</h3>
                    </div>

                    <div className="mb-4">
                        <p className="opacity-60 text-xs font-black uppercase mb-2 tracking-widest">Texto Corrigido</p>
                        <div className="flex items-start gap-2">
                             <p className="text-2xl font-bold leading-relaxed">{writingResult.corrected}</p>
                             <button onClick={() => speak(writingResult.corrected)} className="p-2 bg-black/5 rounded-full hover:bg-black/10 shrink-0"><Volume2 size={20}/></button>
                        </div>
                    </div>

                    {writingResult.changes.length > 0 && (
                        <div className="mb-4 bg-white/50 p-4 rounded-xl">
                            <p className="opacity-60 text-xs font-black uppercase mb-2 tracking-widest">Melhorias</p>
                            <ul className="space-y-2">
                                {writingResult.changes.map((change, i) => (
                                    <li key={i} className="flex gap-2 items-start text-sm font-medium">
                                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                                        {change}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    
                    <p className="text-sm font-bold italic opacity-75 border-t pt-3 border-black/10">
                        "{writingResult.feedback}"
                    </p>
                </div>
            )}

            <VoiceButton 
                voiceLabel="Corrigir texto"
                variant="primary"
                disabled={!writingText.trim()}
                onClick={async () => {
                    if (!writingText.trim()) return;
                    speak("Verificando seu texto...");
                    setWritingResult(null); // Clear previous
                    const result = await checkWriting(writingText);
                    setWritingResult(result);
                    speak("Pronto. " + result.feedback);
                }}
                className="w-full bg-purple-600 hover:bg-purple-700 border-purple-800 mb-6"
            >
                <Pencil className="mr-2" /> CORRIGIR
            </VoiceButton>
         </div>
      </div>
  );

  // --- VIEW: ASSISTANT ---
  const renderAssistant = () => {
      const handleSend = async () => {
          if (!chatInput.trim()) return;
          const userMsg = chatInput;
          setChatInput("");
          setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
          
          const loadingMsg = { role: 'model' as const, text: "Pensando..." };
          setChatHistory(prev => [...prev, loadingMsg]);

          const result = await askAssistant(userMsg);
          
          setChatHistory(prev => {
              const newHist = [...prev];
              newHist.pop(); // remove loading
              newHist.push({ role: 'model', text: result.text });
              return newHist;
          });
          speak(result.text);
      };

      return (
        <div className={`h-screen flex flex-col ${themeClass} ${fontClass} ${sizeClass}`}>
            <Header title="Assistente" onBack={() => navigateTo(AppView.HOME, "Menu inicial")} />
            
            <div className="flex-1 overflow-y-auto p-4 gap-4 flex flex-col">
                {chatHistory.length === 0 && (
                    <div className="flex flex-col items-center justify-center flex-1 opacity-50 text-center p-8">
                        <Bot size={64} className="mb-4" />
                        <p className="text-xl font-bold">Olá! Ainda não tenho nome.</p>
                        <p className="mt-2">Pode me perguntar qualquer coisa ou me dar um nome!</p>
                    </div>
                )}
                
                {chatHistory.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`
                            max-w-[85%] p-5 rounded-3xl text-lg font-medium leading-relaxed shadow-sm
                            ${msg.role === 'user' 
                                ? (settings.theme === 'contrast' ? 'bg-yellow-400 text-black' : 'bg-blue-600 text-white rounded-tr-sm') 
                                : (settings.theme === 'contrast' ? 'bg-slate-800 text-white border border-yellow-400' : 'bg-white border-2 border-slate-100 rounded-tl-sm')
                            }
                        `}>
                            {msg.text}
                            {msg.role === 'model' && (
                                <button onClick={() => speak(msg.text)} className="ml-2 p-1 bg-black/5 rounded-full align-middle"><Volume2 size={16}/></button>
                            )}
                        </div>
                    </div>
                ))}
                <div ref={chatEndRef} />
            </div>

            <div className={`p-4 border-t ${settings.theme === 'contrast' ? 'border-yellow-400 bg-black' : 'border-slate-200 bg-slate-50'}`}>
                <div className="flex gap-2 max-w-3xl mx-auto">
                    <input 
                        type="text" 
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Digite sua pergunta..."
                        className={`flex-1 p-4 rounded-2xl outline-none border-2 font-bold ${settings.theme === 'contrast' ? 'bg-slate-900 border-yellow-400 text-white' : 'bg-white border-slate-200 focus:border-blue-400'}`}
                    />
                    <VoiceButton 
                        voiceLabel="Enviar mensagem" 
                        variant="primary" 
                        onClick={handleSend}
                        className="w-16 rounded-2xl"
                    >
                        <ArrowLeft className="rotate-[135deg]" strokeWidth={3} />
                    </VoiceButton>
                </div>
            </div>
        </div>
      );
  };

  // --- ROUTER ---
  const renderCurrentView = () => {
      switch (currentView) {
          case AppView.CAMERA: return renderCamera();
          case AppView.GALLERY: return renderGallery();
          case AppView.WRITING: return renderWriting();
          case AppView.ASSISTANT: return renderAssistant();
          case AppView.SETTINGS: return renderSettings();
          case AppView.GAMES: return renderGames();
          // If in game session but view is GAMES, we render session if activeLevel is set
          default: return activeLevel ? renderGameSession() : renderHome();
      }
  };

  // Override main render for games sub-view logic
  if (currentView === AppView.GAMES && activeLevel) {
      return renderGameSession();
  }

  return renderCurrentView();
}