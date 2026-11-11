import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiError, GoogleGenAI, ThinkingConfig, ThinkingLevel } from '@google/genai';
import { AppConfig } from '../../config/configuration';
import { LlmGenerateOptions, LlmProvider } from './llm.interface';

const MAX_ATTEMPTS = 3;

/**
 * Flash models: minimal "thinking" = faster + cheaper for a front-desk bot.
 * Gemini 2.x turns thinking off with thinkingBudget 0. Newer models reject that
 * (400 INVALID_ARGUMENT) and use thinkingLevel instead.
 */
function thinkingFor(model: string): { thinkingConfig?: ThinkingConfig } {
  if (!model.includes('flash')) return {};
  if (/^gemini-2\./.test(model)) return { thinkingConfig: { thinkingBudget: 0 } };
  return { thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL } };
}

@Injectable()
export class GeminiLlmProvider implements LlmProvider {
  readonly name = 'gemini';
  private readonly logger = new Logger(GeminiLlmProvider.name);
  private readonly ai: GoogleGenAI;
  private readonly model: string;

  constructor(config: ConfigService<AppConfig, true>) {
    const gemini = config.get('gemini', { infer: true });
    if (!gemini.apiKey) this.logger.warn('GEMINI_API_KEY is empty - chat will fail.');
    this.ai = new GoogleGenAI({ apiKey: gemini.apiKey });
    this.model = gemini.chatModel;
  }

  async generate(opts: LlmGenerateOptions): Promise<string> {
    const contents = opts.messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const request = {
      model: this.model,
      contents,
      config: {
        systemInstruction: opts.system,
        temperature: opts.temperature ?? 0.2,
        maxOutputTokens: opts.maxOutputTokens ?? 800,
        responseMimeType: opts.json ? 'application/json' : 'text/plain',
        ...thinkingFor(this.model),
      },
    };

    // Gemini returns short-lived 500/503 "high demand" errors; a quick retry saves the
    // visitor from the fallback reply. Quota errors (429) are not retried: they last hours.
    for (let attempt = 1; ; attempt++) {
      try {
        const res = await this.ai.models.generateContent(request);
        return res.text ?? '';
      } catch (e) {
        const status = e instanceof ApiError ? e.status : 0;
        if (attempt >= MAX_ATTEMPTS || (status !== 500 && status !== 503)) throw e;
        this.logger.warn(`Gemini ${status}, retry ${attempt}/${MAX_ATTEMPTS - 1}`);
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
  }
}
