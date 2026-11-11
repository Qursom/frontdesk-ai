import { Inject, Injectable, Logger } from '@nestjs/common';
import { ChatTurn, LLM_PROVIDER, LlmProvider } from '../providers/llm/llm.interface';
import { RetrievalService } from '../rag/retrieval.service';
import { TenantDocument } from '../schemas';
import { ChatAction } from './chat.types';
import { buildSystemPrompt } from './prompts/system-prompt';

export interface AgentResult {
  reply: string;
  action: ChatAction;
  sources: string[];
}

/** Parse the model's JSON safely (models sometimes wrap it in ``` fences). */
function parseModelJson(raw: string): { reply?: string; action?: string; usedSources?: number[] } | null {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const m = /\{[\s\S]*\}/.exec(cleaned);
    if (!m) return null;
    try {
      return JSON.parse(m[0]);
    } catch {
      return null;
    }
  }
}

const REPHRASE = "Sorry, I didn't catch that. Could you rephrase your question?";

/**
 * Best visitor-facing text when the model's output is not valid JSON.
 * Plain prose is shown as it is. Broken or cut-off JSON is never shown: we rescue a finished
 * "reply" string if there is one, otherwise ask the visitor to rephrase.
 */
function replyFromBrokenOutput(raw: string): string {
  const text = raw.trim();
  if (!text) return REPHRASE;
  if (!/^(```|\{|\[)/.test(text)) return text;

  const m = /"reply"\s*:\s*("(?:[^"\\]|\\.)*")/.exec(text);
  if (m) {
    try {
      const reply: unknown = JSON.parse(m[1]);
      if (typeof reply === 'string' && reply.trim()) return reply.trim();
    } catch {
      /* fall through */
    }
  }
  return REPHRASE;
}

/**
 * One "turn" of the agent: retrieve -> prompt -> LLM -> parse.
 * Phase 2: this is where tools (getFreeSlots, bookAppointment) plug in.
 */
@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    private readonly retrieval: RetrievalService,
    @Inject(LLM_PROVIDER) private readonly llm: LlmProvider,
  ) {}

  async run(tenant: TenantDocument, history: ChatTurn[], userMessage: string): Promise<AgentResult> {
    // Use the last user turn + current message as the search query (helps follow-ups like "and how much is it?").
    const lastUser = [...history].reverse().find((h) => h.role === 'user')?.content ?? '';
    const query = `${lastUser}\n${userMessage}`.trim().slice(-1000);
    const context = await this.retrieval.retrieve(tenant._id, query, 4);

    const raw = await this.llm.generate({
      system: buildSystemPrompt(tenant, context),
      messages: [...history, { role: 'user', content: userMessage }],
      json: true,
    });

    const parsed = parseModelJson(raw);
    if (!parsed?.reply || typeof parsed.reply !== 'string') {
      this.logger.warn(`Unparseable model output: ${raw.slice(0, 200)}`);
      return { reply: replyFromBrokenOutput(raw), action: 'NONE', sources: [] };
    }

    // Safety net: if the reply text says the team will follow up, the form must appear even if the
    // model forgot to set the action field (small models occasionally drop it).
    const replyImpliesForm =
      /\b(team will contact|leave (your )?(name|number|details)|get back to you|will contact you|contact you (shortly|soon|as soon)|confirm.{0,30}(appointment|time|slot))\b/i.test(
        parsed.reply,
      );
    const action: ChatAction = parsed.action === 'SHOW_LEAD_FORM' || replyImpliesForm ? 'SHOW_LEAD_FORM' : 'NONE';
    const sources = (parsed.usedSources ?? [])
      .map((n) => context[n - 1]?.heading)
      .filter((h): h is string => Boolean(h));

    return { reply: parsed.reply.trim(), action, sources: [...new Set(sources)] };
  }
}
