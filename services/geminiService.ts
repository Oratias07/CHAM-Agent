import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AGENT_SYSTEM_PROMPT_TEMPLATE } from "../constants";
import { GradingInputs, GradingResult } from "../types";

/**
 * Get the API Key from the environment.
 * We check multiple possible locations where the build tool might have placed it.
 */
const getApiKey = () => {
  // 1. Standard process.env (replaced by Vite define)
  if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
    return process.env.API_KEY;
  }
  // 2. Vite's import.meta.env (if prefixed correctly or using envPrefix)
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_KEY) {
    // @ts-ignore
    return import.meta.env.VITE_API_KEY;
  }
  return null;
};

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    score: {
      type: Type.NUMBER,
      description: "The numerical score from 0 to 10",
    },
    feedback: {
      type: Type.STRING,
      description: "A professional feedback paragraph in Hebrew",
    },
  },
  required: ["score", "feedback"],
};

export const evaluateSubmission = async (
  inputs: GradingInputs
): Promise<GradingResult> => {
  const apiKey = getApiKey();
  
  if (!apiKey || apiKey === "MISSING_KEY") {
    throw new Error("API Key is missing. Please ensure 'API_KEY' is set in your environment variables (e.g., Vercel Dashboard) and then REDEPLOY the application to bake the key into the build.");
  }

  // Create a new instance for every call to ensure fresh configuration
  const ai = new GoogleGenAI({ apiKey });

  // Interpolate the template
  const prompt = AGENT_SYSTEM_PROMPT_TEMPLATE
    .replace("{QUESTION_TEXT}", inputs.question)
    .replace("{MASTER_SOLUTION}", inputs.masterSolution)
    .replace("{RUBRIC}", inputs.rubric)
    .replace("{STUDENT_CODE}", inputs.studentCode)
    .replace("{AGENT_CUSTOM_INSTRUCTIONS}", inputs.customInstructions);

  try {
    // Using gemini-3-pro-preview for high-quality grading reasoning
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        thinkingConfig: {
          thinkingBudget: 32768, 
        },
      },
    });

    const textResponse = response.text;
    if (!textResponse) {
      throw new Error("Received empty response from Gemini.");
    }

    const result = JSON.parse(textResponse) as GradingResult;
    return result;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error && (error.message.includes("403") || error.message.includes("not found"))) {
       throw new Error("API Key invalid or model restricted. Check your Google AI Studio settings and project billing.");
    }
    throw error;
  }
};

export const sendChatMessage = async (
  message: string,
  history: { role: string; parts: { text: string }[] }[]
): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key is missing.");

  const ai = new GoogleGenAI({ apiKey });

  try {
    const chat = ai.chats.create({
      model: "gemini-3-pro-preview",
      history: history,
      config: {
        thinkingConfig: {
            thinkingBudget: 16384
        }
      }
    });

    const result = await chat.sendMessage({ message });
    return result.text || "No response generated.";
  } catch (error) {
    console.error("Error in chat:", error);
    throw error;
  }
};