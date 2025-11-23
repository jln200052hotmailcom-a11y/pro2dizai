import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

const SYSTEM_INSTRUCTION_BASE = `
Você é um assistente amigável para adultos com dificuldades de leitura.
Respostas curtas e simples.
`;

// Fallback questions in case of API quota error
const FALLBACK_QUESTIONS = [
    {
        question: "O que usamos para cortar papel?",
        options: ["Tesoura", "Colher", "Pedra"],
        correctAnswer: "Tesoura",
        explanation: "A tesoura corta."
    },
    {
        question: "Qual destas é uma fruta?",
        options: ["Mesa", "Banana", "Carro"],
        correctAnswer: "Banana",
        explanation: "Banana é fruta."
    },
    {
        question: "Qual letra vem depois do A?",
        options: ["C", "B", "D"],
        correctAnswer: "B",
        explanation: "A, B, C."
    }
];

export const analyzeImageText = async (base64Data: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
          { text: "Extraia o texto. Se não houver, diga 'Não li nada'." }
        ]
      }
    });
    return response.text || "Não li nada.";
  } catch (error) {
    return "Erro ao ler imagem.";
  }
};

export const generateLiteracyGame = async (promptContext: string = "alfabetização"): Promise<any> => {
  try {
    const fullPrompt = `
      Gere um desafio de alfabetização: ${promptContext}
      Retorne JSON EXCLUSIVAMENTE:
      {
        "question": "Pergunta curta e simples",
        "options": ["Certa", "Errada1", "Errada2"],
        "correctAnswer": "Certa",
        "explanation": "Feedback positivo muito curto"
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: fullPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctAnswer: { type: Type.STRING },
            explanation: { type: Type.STRING }
          },
          required: ["question", "options", "correctAnswer", "explanation"]
        }
      }
    });
    
    if (response.text) {
        return JSON.parse(response.text);
    }
    throw new Error("Empty");
  } catch (error) {
    const randomFallback = FALLBACK_QUESTIONS[Math.floor(Math.random() * FALLBACK_QUESTIONS.length)];
    return randomFallback;
  }
};

export const checkWriting = async (text: string): Promise<{ corrected: string; changes: string[]; feedback: string }> => {
  try {
    const prompt = `
      Você é um assistente de escrita. O usuário enviou: "${text}".
      1. Corrija gramática, ortografia e pontuação.
      2. Melhore a clareza se necessário.
      
      Retorne JSON EXCLUSIVAMENTE:
      {
        "corrected": "O texto completo corrigido",
        "changes": ["Breve explicação da mudança 1", "Breve explicação da mudança 2 (máximo 3)"],
        "feedback": "Uma frase curta e encorajadora sobre o texto"
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                corrected: { type: Type.STRING },
                changes: { type: Type.ARRAY, items: { type: Type.STRING } },
                feedback: { type: Type.STRING }
            }
        }
      }
    });
    if (response.text) {
        return JSON.parse(response.text);
    }
    throw new Error("Empty");
  } catch (error) {
    return { corrected: text, changes: ["Não foi possível corrigir agora."], feedback: "Tente novamente mais tarde." };
  }
};

export const askAssistant = async (query: string): Promise<{ text: string; urls?: Array<{ title: string; uri: string }> }> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: query,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: SYSTEM_INSTRUCTION_BASE,
      }
    });

    const text = response.text || "Não entendi.";
    
    let urls: Array<{ title: string; uri: string }> = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    
    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.web?.uri && chunk.web?.title) {
          urls.push({ title: chunk.web.title, uri: chunk.web.uri });
        }
      });
    }

    return { text, urls };
  } catch (error) {
    return { text: "Erro na busca." };
  }
};