export const LLM_PROVIDER = Symbol('LLM_PROVIDER');

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface LlmGenerateOptions {
  system: string;
  messages: ChatTurn[];
  /** Ask the model for a JSON object response. */
  json?: boolean;
  temperature?: number;
  maxOutputTokens?: number;
}

/**
 * Swap implementations without touching business code:
 * Gemini (demo, free) -> Azure OpenAI EU / Mistral (EU clients) later.
 */
export interface LlmProvider {
  readonly name: string;
  generate(opts: LlmGenerateOptions): Promise<string>;
}
