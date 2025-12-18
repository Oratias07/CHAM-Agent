
// Always use the correct import from @google/genai
import { GoogleGenAI, Type } from "@google/genai";
import { AGENT_SYSTEM_PROMPT_TEMPLATE } from "../constants";
import { GradingInputs, GradingResult } from "../types";

/**
 * Access the API key exclusively from the environment variable process.env.API_KEY.
 * The SDK must be initialized with a named parameter: { apiKey: string }.
 */
const getApiKey = () => {
  const key = process.env.API_KEY;
  if (key && key !== "MISSING_KEY" && key.length > 5) {
    return key;
  }
  return null;
};

const apiKey = getApiKey();

// Initialize AI client; we ensure it uses the provided API_KEY format
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// Define responseSchema using the Type enum. Do not use the deprecated Schema type.
const responseSchema = {
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

export const isApiKeyMissing = () => !apiKey;

/**
 * Evaluates a student's code submission using the Gemini 3 Pro model.
 */
export const evaluateSubmission = async (
  inputs: GradingInputs
): Promise<GradingResult> => {
  if (!ai || !apiKey) {
    throw new Error("API Key is missing from the application build. Please add 'API_KEY' to your Vercel Environment Variables and REDEPLOY the project.");
  }

  const prompt = AGENT_SYSTEM_PROMPT_TEMPLATE
    .replace("{QUESTION_TEXT}", inputs.question)
    .replace("{MASTER_SOLUTION}", inputs.masterSolution)
    .replace("{RUBRIC}", inputs.rubric)
    .replace("{STUDENT_CODE}", inputs.studentCode)
    .replace("{AGENT_CUSTOM_INSTRUCTIONS}", inputs.customInstructions);

  try {
    // Call generateContent directly with model name and contents.
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        thinkingConfig: {
          // Gemini 3 Pro supports reasoning; 32768 is the maximum budget for Pro series.
          thinkingBudget: 32768, 
        },
      },
    });

    // Directly access the .text property of the GenerateContentResponse object.
    const textResponse = response.text;
    if (!textResponse) {
      throw new Error("Received empty response from Gemini.");
    }

    // Trim output before parsing as per JSON response best practices.
    return JSON.parse(textResponse.trim()) as GradingResult;

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    const errorMessage = error?.message || "";
    if (errorMessage.includes("403") || errorMessage.includes("API_KEY_INVALID")) {
      throw new Error("Invalid API Key. Please verify your Gemini API key.");
    }
    
    throw new Error(`Evaluation failed: ${errorMessage || "Unknown error during API call"}`);
  }
};

/**
 * Sends a chat message and returns the model response.
 */
export const sendChatMessage = async (
  message: string,
  history: { role: string; parts: { text: string }[] }[]
): Promise<string> => {
  if (!ai || !apiKey) {
    throw new Error("API Key missing.");
  }

  try {
    // Create a new chat session. The model and config are required.
    const chat = ai.chats.create({
      model: "gemini-3-pro-preview",
      history: history,
      config: {
        thinkingConfig: {
            thinkingBudget: 32768
        }
      }
    });

    // Use sendMessage with the message parameter and access the .text property for the output.
    const result = await chat.sendMessage({ message });
    return result.text || "No response generated.";
  } catch (error: any) {
    console.error("Chat Error:", error);
    return `Chat error: ${error?.message || "Check your API connection"}`;
  }
};
