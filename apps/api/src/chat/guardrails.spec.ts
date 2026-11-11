import { checkGuardrails } from './guardrails';

describe('checkGuardrails', () => {
  describe('emergencies', () => {
    it.each([
      'My face is swollen and my tooth hurts badly',
      'There is swelling under my jaw',
      "I'm in pain", // widget quick reply
      'I am in so much pain',
      "My gum is bleeding and it won't stop",
      'heavy bleeding after my extraction',
      "I can't swallow properly",
      'I have difficulty breathing',
      'My tooth got knocked out playing football',
      'I think I have a broken tooth',
      'I have severe toothache',
      'unbearable pain since last night',
      'I think I have an abscess',
      'I was hit in the face',
      'I have a fever and my tooth hurts',
      'This is an emergency',
      'MY FACE IS SWOLLEN',
    ])('flags "%s"', (text) => {
      expect(checkGuardrails(text).type).toBe('EMERGENCY');
    });

    it('returns the text that matched', () => {
      expect(checkGuardrails('My face is swollen')).toEqual({ type: 'EMERGENCY', matched: 'swollen' });
    });

    it('wins over a human request in the same message', () => {
      expect(checkGuardrails('My face is swollen, can I talk to a person?').type).toBe('EMERGENCY');
    });
  });

  describe('human requests', () => {
    it.each([
      'Can I speak to a real person please?',
      'Talk to the team', // widget quick reply
      'I want to talk to someone',
      'can I chat with a receptionist',
      'I need a human',
      'Please call me back',
      'I want to make a complaint',
    ])('flags "%s"', (text) => {
      expect(checkGuardrails(text).type).toBe('HUMAN');
    });
  });

  describe('normal questions go to the agent', () => {
    it.each([
      'How much is an emergency appointment?',
      'Do you have emergency appointments on Saturday?',
      'How much is teeth whitening?',
      'Are you open on Saturday?',
      "I'd like to book a check-up next week",
      'Does teeth whitening hurt?',
      'Which painkiller should I take for my toothache?', // medical advice is refused by the prompt, not the guardrail
      'Am I talking to a human?', // answered by the agent: "I'm an AI assistant"
      'Do you accept Bupa insurance?',
      '',
    ])('does not flag "%s"', (text) => {
      expect(checkGuardrails(text)).toEqual({ type: 'NONE' });
    });
  });

  it('only looks at the first 1000 characters', () => {
    expect(checkGuardrails(`${'a '.repeat(500)}my face is swollen`).type).toBe('NONE');
  });
});
