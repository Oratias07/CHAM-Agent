import { GradingInputs, GradingResult } from "../types";
import { apiService } from "./apiService";

/**
 * In a true SaaS, we don't call the Gemini SDK directly from the frontend.
 * We send the request to our own server, which then calls Gemini.
 */
export const evaluateSubmission = async (
  inputs: GradingInputs
): Promise<GradingResult> => {
  return await apiService.evaluate(inputs);
};

export const sendChatMessage = async (
  message: string,
  history: { role: string; parts: { text: string }[] }[]
): Promise<string> => {
  // Similar to evaluate, chat would ideally be proxied through the server
  // to prevent API key exposure and allow for rate limiting per user.
  const res = await fetch("/api/chat", {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history })
  });
  const data = await res.json();
  return data.text || "I'm having trouble connecting to the server.";
};