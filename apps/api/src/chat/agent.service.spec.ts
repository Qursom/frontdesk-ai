import { Logger } from '@nestjs/common';
import type { LlmGenerateOptions, LlmProvider } from '../providers/llm/llm.interface';
import type { RetrievalService, RetrievedChunk } from '../rag/retrieval.service';
import type { TenantDocument } from '../schemas';
import { AgentService } from './agent.service';

// No network and no database: retrieval (MongoDB + embeddings) and the LLM are both mocked.
// Mocking the module also keeps Mongoose out of this test, so it starts fast.
jest.mock('../rag/retrieval.service', () => ({ RetrievalService: class {} }));

const context: RetrievedChunk[] = [
  { heading: 'Clinic > Prices > Cosmetic treatments', text: 'Teeth whitening at home: £350', source: 'clinic.md', score: 0.9 },
  { heading: 'Clinic > Opening hours', text: 'Saturday: 9:00am – 1:00pm', source: 'clinic.md', score: 0.8 },
];

const tenant = {
  _id: 'tenant-id-1',
  name: 'Test Clinic',
  botName: 'Testbot',
  phone: '000',
  emergencyInfo: '',
  extraRules: '',
} as unknown as TenantDocument;

function setup(llmOutput: string, chunks: RetrievedChunk[] = context) {
  const retrieve = jest.fn().mockResolvedValue(chunks);
  const generate = jest.fn<Promise<string>, [LlmGenerateOptions]>().mockResolvedValue(llmOutput);
  const llm: LlmProvider = { name: 'mock', generate };
  const agent = new AgentService({ retrieve } as unknown as RetrievalService, llm);
  return { agent, retrieve, generate };
}

describe('AgentService JSON parsing', () => {
  beforeAll(() => {
    // The service warns on unparseable output; keep the test log clean.
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });
  afterAll(() => jest.restoreAllMocks());

  it('parses plain JSON', async () => {
    const { agent } = setup('{"reply": "Whitening at home is £350.", "action": "NONE", "usedSources": [1]}');

    await expect(agent.run(tenant, [], 'How much is whitening?')).resolves.toEqual({
      reply: 'Whitening at home is £350.',
      action: 'NONE',
      sources: ['Clinic > Prices > Cosmetic treatments'],
    });
  });

  it('parses JSON inside a ```json fence', async () => {
    const { agent } = setup('```json\n{"reply": "The team will confirm a time.", "action": "SHOW_LEAD_FORM", "usedSources": []}\n```');

    await expect(agent.run(tenant, [], "I'd like to book")).resolves.toEqual({
      reply: 'The team will confirm a time.',
      action: 'SHOW_LEAD_FORM',
      sources: [],
    });
  });

  it('parses JSON inside a plain ``` fence', async () => {
    const { agent } = setup('```\n{"reply": "Yes, 9am to 1pm.", "action": "NONE", "usedSources": [2]}\n```');
    const result = await agent.run(tenant, [], 'Open Saturday?');

    expect(result.reply).toBe('Yes, 9am to 1pm.');
    expect(result.sources).toEqual(['Clinic > Opening hours']);
  });

  it('finds the JSON object when the model adds text around it', async () => {
    const { agent } = setup('Here is my answer:\n{"reply": "We are open.", "action": "NONE"}\nHope that helps!');
    const result = await agent.run(tenant, [], 'Open?');

    expect(result).toEqual({ reply: 'We are open.', action: 'NONE', sources: [] });
  });

  it('trims the reply', async () => {
    const { agent } = setup('{"reply": "  Hello.  \\n", "action": "NONE"}');
    expect((await agent.run(tenant, [], 'Hi')).reply).toBe('Hello.');
  });

  describe('broken output never gives a blank reply', () => {
    it('uses the raw text when it is not JSON', async () => {
      const { agent } = setup('Sorry, we are closed on Sundays.');

      await expect(agent.run(tenant, [], 'Sunday?')).resolves.toEqual({
        reply: 'Sorry, we are closed on Sundays.',
        action: 'NONE',
        sources: [],
      });
    });

    it('rescues a finished reply from cut-off JSON', async () => {
      const { agent } = setup('{"reply": "A check-up is \\"about\\" £55.", "action": "NO');

      await expect(agent.run(tenant, [], 'Price?')).resolves.toEqual({
        reply: 'A check-up is "about" £55.',
        action: 'NONE',
        sources: [],
      });
    });

    it('never shows raw JSON when the reply itself is cut off', async () => {
      const { agent } = setup('```json\n{"reply": "A check-up is');
      const result = await agent.run(tenant, [], 'Price?');

      expect(result.reply).toMatch(/rephrase/i);
      expect(result.reply).not.toContain('{');
    });

    it('asks to rephrase when the reply is not a string', async () => {
      const { agent } = setup('{"reply": {"text": "hello"}, "action": "NONE"}');
      expect((await agent.run(tenant, [], 'Hi')).reply).toMatch(/rephrase/i);
    });

    it('asks to rephrase when the output is empty', async () => {
      const { agent } = setup('   ');
      const result = await agent.run(tenant, [], 'Hi');

      expect(result.reply).toMatch(/rephrase/i);
      expect(result.action).toBe('NONE');
    });

    it('treats JSON without a reply as broken', async () => {
      const { agent } = setup('{"action": "SHOW_LEAD_FORM"}');
      const result = await agent.run(tenant, [], 'Hi');

      expect(result.reply).toMatch(/rephrase/i);
      expect(result.action).toBe('NONE');
    });
  });

  describe('action', () => {
    // HANDOFF is decided by guardrails / the error fallback in ChatService, never by the model.
    it.each(['HANDOFF', 'BOOK_NOW', '', undefined])('maps model action %p to NONE', async (action) => {
      const { agent } = setup(JSON.stringify({ reply: 'ok', action }));
      expect((await agent.run(tenant, [], 'Hi')).action).toBe('NONE');
    });
  });

  describe('sources', () => {
    it('ignores source numbers that do not exist and removes duplicates', async () => {
      const { agent } = setup('{"reply": "ok", "action": "NONE", "usedSources": [1, 1, 0, 7, 2]}');
      const result = await agent.run(tenant, [], 'Hi');

      expect(result.sources).toEqual(['Clinic > Prices > Cosmetic treatments', 'Clinic > Opening hours']);
    });
  });

  describe('what is sent to retrieval and the LLM', () => {
    it('searches by tenant with the last user turn plus the new message', async () => {
      const { agent, retrieve } = setup('{"reply": "ok", "action": "NONE"}');
      await agent.run(
        tenant,
        [
          { role: 'user', content: 'Tell me about Invisalign' },
          { role: 'assistant', content: 'It straightens teeth.' },
        ],
        'and how much is it?',
      );

      expect(retrieve).toHaveBeenCalledWith(tenant._id, 'Tell me about Invisalign\nand how much is it?', 4);
    });

    it('asks for JSON and puts the retrieved clinic text in the system prompt', async () => {
      const { agent, generate } = setup('{"reply": "ok", "action": "NONE"}');
      await agent.run(tenant, [{ role: 'user', content: 'Hi' }], 'How much is whitening?');

      const opts = generate.mock.calls[0][0];
      expect(opts.json).toBe(true);
      expect(opts.system).toContain('[1] Teeth whitening at home: £350');
      expect(opts.system).toContain('Test Clinic');
      expect(opts.messages).toEqual([
        { role: 'user', content: 'Hi' },
        { role: 'user', content: 'How much is whitening?' },
      ]);
    });
  });
});
