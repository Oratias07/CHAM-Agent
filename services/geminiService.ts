
import { GradingInputs, GradingResult } from "../types";
import { apiService } from "./apiService";

export const evaluateSubmission = async (
  inputs: GradingInputs
): Promise<GradingResult> => {
  return await apiService.evaluate(inputs);
};

export const sendChatMessage = async (
  message: string,
  context?: any
): Promise<string> => {
  const res = await fetch("/api/chat", {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, context })
  });
  const data = await res.json();
  return data.text || "I'm having trouble connecting to the server.";
};
