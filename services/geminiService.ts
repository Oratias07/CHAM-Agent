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
    throw new Error("API_KEY is not defined. Please add it to your environment variables and redeploy.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = AGENT_SYSTEM_PROMPT_TEMPLATE
    .replace("{QUESTION_TEXT}", inputs.question)
    .replace("{MASTER_SOLUTION}", inputs.masterSolution)
    .replace("{RUBRIC}", inputs.rubric)
    .replace("{STUDENT_CODE}", inputs.studentCode)
    .replace("{AGENT_CUSTOM_INSTRUCTIONS}", inputs.customInstructions);

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("The AI returned an empty response.");
    }

    return JSON.parse(text) as GradingResult;
  } catch (error: any) {
    console.error("Evaluation error:", error);
    if (error?.message?.includes("429") || error?.status === "RESOURCE_EXHAUSTED") {
      throw new Error("Rate limit reached. The free tier allows limited requests per minute. Please try again in 60 seconds.");
    }
    throw error;
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
    });

    const result = await chat.sendMessage({ message });
    return result.text || "I couldn't generate a response.";
  } catch (error: any) {
    console.error("Chat error:", error);
    if (error?.message?.includes("429")) return "Rate limit exceeded. Please wait a moment.";
    throw error;
  }
};