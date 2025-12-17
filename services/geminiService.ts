import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AGENT_SYSTEM_PROMPT_TEMPLATE } from "../constants";
import { GradingInputs, GradingResult } from "../types";

// Access the API key defined in vite.config.ts
const apiKey = process.env.API_KEY;

// Initialize the client. If apiKey is missing, we pass a placeholder to avoid immediate crash,
// but specific actions will verify the key.
const ai = new GoogleGenAI({ apiKey: apiKey || "MISSING_KEY" });

if (!apiKey) {
  console.warn("Warning: API_KEY is missing in process.env. Submissions will fail.");
}

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
  if (!apiKey || apiKey === "MISSING_KEY") {
    throw new Error("API Key is missing. Please check your Vercel project settings (Environment Variables) and ensure 'API_KEY' is set, then redeploy.");
  }

  // Interpolate the template
  const prompt = AGENT_SYSTEM_PROMPT_TEMPLATE
    .replace("{QUESTION_TEXT}", inputs.question)
    .replace("{MASTER_SOLUTION}", inputs.masterSolution)
    .replace("{RUBRIC}", inputs.rubric)
    .replace("{STUDENT_CODE}", inputs.studentCode)
    .replace("{AGENT_CUSTOM_INSTRUCTIONS}", inputs.customInstructions);

  try {
    // Using gemini-3-pro-preview with thinking for complex reasoning (Grading)
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
    if (error instanceof Error && error.message.includes("403")) {
       throw new Error("API Key invalid or not enabled for this model. Please check Google AI Studio settings.");
    }
    throw error;
  }
};

export const sendChatMessage = async (
  message: string,
  history: { role: string; parts: { text: string }[] }[]
): Promise<string> => {
  if (!apiKey || apiKey === "MISSING_KEY") {
    throw new Error("API Key is missing.");
  }

  try {
    const chat = ai.chats.create({
      model: "gemini-3-pro-preview",
      history: history,
      config: {
        // Chatbot doesn't necessarily need strict JSON or heavy thinking for simple queries,
        // but the prompt requests "gemini-3-pro-preview" for the chatbot.
        // We will enable thinking here as well to handle "complex queries" as requested.
        thinkingConfig: {
            thinkingBudget: 32768
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