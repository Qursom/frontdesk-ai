import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ChatRequestDto } from '../chat/dto/chat-request.dto';
import { CreateLeadDto } from '../leads/dto/create-lead.dto';
import { TimeoutError, withTimeout } from './with-timeout';

// Same options as the global ValidationPipe in main.ts.
async function check<T extends object>(cls: new () => T, body: unknown) {
  const dto = plainToInstance(cls, body);
  const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
  return { dto, fields: errors.map((e) => e.property) };
}

describe('ChatRequestDto', () => {
  const ok = { tenant: 'bright-smile', message: 'Hello' };

  it('accepts a normal message and trims it', async () => {
    const { dto, fields } = await check(ChatRequestDto, { ...ok, message: '  Hello  ' });
    expect(fields).toEqual([]);
    expect(dto.message).toBe('Hello');
  });

  it.each([
    ['whitespace only', { ...ok, message: '     ' }],
    ['empty', { ...ok, message: '' }],
    ['too long', { ...ok, message: 'a'.repeat(1001) }],
    ['not a string', { ...ok, message: { $gt: '' } }],
    ['missing', { tenant: 'bright-smile' }],
  ])('rejects a message that is %s', async (_name, body) => {
    expect((await check(ChatRequestDto, body)).fields).toContain('message');
  });

  it('accepts exactly 1000 characters', async () => {
    expect((await check(ChatRequestDto, { ...ok, message: 'a'.repeat(1000) })).fields).toEqual([]);
  });

  it.each(['Bright Smile', '../etc', 'a', '', 'x'.repeat(61)])('rejects tenant %p', async (tenant) => {
    expect((await check(ChatRequestDto, { ...ok, tenant })).fields).toContain('tenant');
  });

  it('rejects a conversationId that is not a Mongo id (no query objects)', async () => {
    expect((await check(ChatRequestDto, { ...ok, conversationId: { $ne: null } })).fields).toContain('conversationId');
    expect((await check(ChatRequestDto, { ...ok, conversationId: 'abc' })).fields).toContain('conversationId');
  });

  it('rejects unknown fields', async () => {
    expect((await check(ChatRequestDto, { ...ok, role: 'admin' })).fields).toContain('role');
  });
});

describe('CreateLeadDto', () => {
  const ok = { tenant: 'bright-smile', name: 'Sam Taylor', phone: '020 7946 0000', consent: true };

  it('accepts the minimum fields', async () => {
    expect((await check(CreateLeadDto, ok)).fields).toEqual([]);
  });

  it('accepts all optional fields and trims text', async () => {
    const { dto, fields } = await check(CreateLeadDto, {
      ...ok,
      name: '  Sam Taylor ',
      email: ' sam@example.com ',
      preferredTime: ' Saturday ',
      reason: ' check-up ',
    });
    expect(fields).toEqual([]);
    expect(dto).toMatchObject({ name: 'Sam Taylor', email: 'sam@example.com', preferredTime: 'Saturday', reason: 'check-up' });
  });

  it.each([
    ['consent false', { ...ok, consent: false }, 'consent'],
    ['consent as text', { ...ok, consent: 'true' }, 'consent'],
    ['consent missing', { tenant: ok.tenant, name: ok.name, phone: ok.phone }, 'consent'],
    ['whitespace name', { ...ok, name: '     ' }, 'name'],
    ['one-letter name', { ...ok, name: 'S' }, 'name'],
    ['name too long', { ...ok, name: 'a'.repeat(101) }, 'name'],
    ['phone with letters', { ...ok, phone: 'call me maybe' }, 'phone'],
    ['phone without digits', { ...ok, phone: '--------' }, 'phone'],
    ['phone of spaces', { ...ok, phone: '        ' }, 'phone'],
    ['phone with too few digits', { ...ok, phone: '+ (12) - 3' }, 'phone'],
    ['phone too long', { ...ok, phone: '1'.repeat(26) }, 'phone'],
    ['empty email', { ...ok, email: '' }, 'email'],
    ['bad email', { ...ok, email: 'sam@' }, 'email'],
    ['preferredTime too long', { ...ok, preferredTime: 'a'.repeat(101) }, 'preferredTime'],
    ['reason too long', { ...ok, reason: 'a'.repeat(301) }, 'reason'],
    ['unknown field', { ...ok, status: 'booked' }, 'status'],
  ])('rejects %s', async (_name, body, field) => {
    expect((await check(CreateLeadDto, body)).fields).toContain(field);
  });

  it.each(['+44 20 7946 0000', '(020) 7946-0000', '07700 900123'])('accepts phone %p', async (phone) => {
    expect((await check(CreateLeadDto, { ...ok, phone })).fields).toEqual([]);
  });
});

describe('withTimeout', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('returns the value when the work finishes in time', async () => {
    await expect(withTimeout(Promise.resolve('done'), 1000)).resolves.toBe('done');
  });

  it('passes on the original error', async () => {
    await expect(withTimeout(Promise.reject(new Error('quota')), 1000)).rejects.toThrow('quota');
  });

  it('rejects with TimeoutError when the work hangs', async () => {
    const never = new Promise<string>(() => undefined);
    const result = withTimeout(never, 30_000, 'Agent');
    const assertion = expect(result).rejects.toBeInstanceOf(TimeoutError);
    jest.advanceTimersByTime(30_000);
    await assertion;
    await expect(result).rejects.toThrow('Agent timed out after 30000ms');
  });

  it('leaves no timer behind after finishing', async () => {
    await withTimeout(Promise.resolve(1), 1000);
    expect(jest.getTimerCount()).toBe(0);
  });
});
