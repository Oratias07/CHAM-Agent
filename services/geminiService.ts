import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AGENT_SYSTEM_PROMPT_TEMPLATE } from "../constants";
import { GradingInputs, GradingResult } from "../types";

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
  const apiKey = process.env.API_KEY;
  
  if (!apiKey || apiKey === "undefined" || apiKey === "") {
    throw new Error("API_KEY is missing. Please configure it in your environment.");
  }

  // Use the most up-to-date instance for the call
  const ai = new GoogleGenAI({ apiKey });

  const prompt = AGENT_SYSTEM_PROMPT_TEMPLATE
    .replace("{QUESTION_TEXT}", inputs.question || "N/A")
    .replace("{MASTER_SOLUTION}", inputs.masterSolution || "N/A")
    .replace("{RUBRIC}", inputs.rubric || "N/A")
    .replace("{STUDENT_CODE}", inputs.studentCode || "N/A")
    .replace("{AGENT_CUSTOM_INSTRUCTIONS}", inputs.customInstructions || "N/A");

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        // SPEED OPTIMIZATIONS
        thinkingConfig: { thinkingBudget: 0 }, // Disable thinking for maximum speed
        temperature: 0.1, // Faster, more focused output
        topP: 0.8,
        topK: 40
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty response from AI.");
    }

    return JSON.parse(text) as GradingResult;
  } catch (error: any) {
    console.error("Evaluation error:", error);
    if (error?.status === 429 || error?.message?.includes("429") || error?.message?.includes("RESOURCE_EXHAUSTED")) {
      throw new Error("Google API Rate Limit Reached. The Free Tier allows limited requests. Please wait 60 seconds or switch to a Paid Project API Key for unlimited access.");
    }
    throw new Error(error?.message || "An unexpected error occurred.");
  }
};

export const sendChatMessage = async (
  message: string,
  history: { role: string; parts: { text: string }[] }[]
): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API_KEY is missing.");

  const ai = new GoogleGenAI({ apiKey });

  try {
    const chat = ai.chats.create({
      model: "gemini-3-flash-preview",
      history: history,
      config: {
        thinkingConfig: { thinkingBudget: 0 } // Fast chat responses
      }
    });

    const result = await chat.sendMessage({ message });
    return result.text || "I couldn't generate a response.";
  } catch (error: any) {
    console.error("Chat error:", error);
    if (error?.message?.includes("429")) return "Rate limit exceeded. Please wait a minute.";
    return "Something went wrong. Please try again.";
  }
};