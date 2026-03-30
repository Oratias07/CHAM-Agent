/**
 * Safe LLM response parser.
 * Handles markdown-wrapped JSON, partial JSON, and malformed responses.
 */
export function safeParseLLMResponse(raw) {
  if (!raw) return null;

  // Try direct parse first
  try {
    return JSON.parse(raw);
  } catch {
    // Strip markdown fences
    const stripped = raw.replace(/```json\n?|```\n?/g, '').trim();
    try {
      return JSON.parse(stripped);
    } catch {
      // Try to extract JSON object from response
      const jsonMatch = stripped.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch {
          return null;
        }
      }
      return null;
    }
  }
}
