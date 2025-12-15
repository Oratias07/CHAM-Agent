import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AGENT_SYSTEM_PROMPT_TEMPLATE } from "../constants";
import { GradingInputs, GradingResult } from "../types";

// Ensure the API key is available
const apiKey = process.env.API_KEY;
if (!apiKey) {
  console.error("API_KEY environment variable is missing.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || "" });

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
  if (!apiKey) {
    throw new Error("API Key is missing. Please check your environment configuration.");
  }

  // Interpolate the template
  const prompt = AGENT_SYSTEM_PROMPT_TEMPLATE
    .replace("{QUESTION_TEXT}", inputs.question)
    .replace("{MASTER_SOLUTION}", inputs.masterSolution)
    .replace("{RUBRIC}", inputs.rubric)
    .replace("{STUDENT_CODE}", inputs.studentCode)
    .replace("{AGENT_CUSTOM_INSTRUCTIONS}", inputs.customInstructions);

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.2, // Low temperature for consistent grading
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
    throw error;
  }
};
