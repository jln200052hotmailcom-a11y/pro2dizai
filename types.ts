export enum AppView {
  HOME = 'HOME',
  CAMERA = 'CAMERA',
  GALLERY = 'GALLERY',
  WRITING = 'WRITING',
  GAMES = 'GAMES',
  ASSISTANT = 'ASSISTANT',
  SETTINGS = 'SETTINGS'
}

export interface GameQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  groundingUrls?: Array<{ title: string; uri: string }>;
}

export interface GameLevel {
  id: number;
  title: string;
  subtitle: string; // e.g. "Nível 1"
  description: string;
  icon: string; // Map to Lucide icon name
  promptContext: string; // Context passed to Gemini
  isLocked?: boolean;
}