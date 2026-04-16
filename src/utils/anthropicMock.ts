/**
 * Final Robust Mock of Anthropic SDK for Zero-Dependency builds.
 * Provides all required error classes, static generate() and compatible message structures.
 */

export class APIError extends Error {
  status: any; headers: any; error: any;
  constructor(message: string, status?: any, headers?: any) {
    super(message); this.name = 'APIError'; this.status = status; this.headers = headers;
  }
  static generate(status: number, error: any, message: string, headers: any) {
    return new APIError(message, status, headers);
  }
}
export { APIError as Error };

export class APIUserAbortError extends APIError { constructor() { super('Abort', 0); this.name = 'APIUserAbortError'; } }
export class APIConnectionError extends APIError { constructor(m: string) { super(m, 0); this.name = 'APIConnectionError'; } }
export class APITimeoutError extends APIConnectionError { constructor() { super('Timeout', 0); this.name = 'APITimeoutError'; } }
export class APIConnectionTimeoutError extends APIConnectionError { constructor() { super('Conn Timeout', 0); this.name = 'APIConnectionTimeoutError'; } }

export class AuthenticationError extends APIError { constructor(m:string) { super(m, 401); this.name = 'AuthenticationError'; } }
export class PermissionDeniedError extends APIError { constructor(m:string) { super(m, 403); this.name = 'PermissionDeniedError'; } }
export class NotFoundError extends APIError { constructor(m:string) { super(m, 404); this.name = 'NotFoundError'; } }
export class ConflictError extends APIError { constructor(m:string) { super(m, 409); this.name = 'ConflictError'; } }
export class UnprocessableEntityError extends APIError { constructor(m:string) { super(m, 422); this.name = 'UnprocessableEntityError'; } }
export class RateLimitError extends APIError { constructor(m:string) { super(m, 429); this.name = 'RateLimitError'; } }
export class InternalServerError extends APIError { constructor(m:string) { super(m, 500); this.name = 'InternalServerError'; } }

export type BetaMessageParam = any;
export type BetaContentBlock = any;
export type BetaContentBlockParam = any;
export type BetaImageBlockParam = any;
export type BetaJSONOutputFormat = any;
export type BetaMessage = any;
export type BetaMessageDeltaUsage = any;
export type BetaMessageStreamParams = any;
export type BetaOutputConfig = any;
export type BetaRawMessageStreamEvent = any;
export type BetaRequestDocumentBlock = any;
export type BetaStopReason = any;
export type BetaToolChoiceAuto = any;
export type BetaToolChoiceTool = any;
export type BetaToolResultBlockParam = any;
export type BetaToolUnion = any;
export type BetaUsage = any;
export type TextBlockParam = any;
export type Stream<T> = any;
export type ClientOptions = any;

export default class Anthropic {
  apiKey: string; baseURL: string;
  constructor(opts: { apiKey?: string; baseURL?: string } = {}) {
    this.apiKey = opts.apiKey || '';
    this.baseURL = opts.baseURL || 'https://api.anthropic.com';
  }
  messages = { create: (p: any) => this._chain(p), stream: (p: any) => this._chain(p) };
  beta = { messages: { create: (p: any) => this._chain(p), stream: (p: any) => this._chain(p) } };
  
  private _chain(_params?: any) {
    const data = {
      id: `msg_${Date.now()}`,
      type: 'message',
      role: 'assistant',
      model: process.env.ANTHROPIC_MODEL || 'cortex-swarm',
      stop_reason: 'end_turn',
      stop_sequence: null,
      content: [{ type: 'text', text: 'SWARM ASSET ONLINE. UPLINK VERIFIED.' }],
      usage: { input_tokens: 0, output_tokens: 0 }
    };
    const p = Promise.resolve(data) as any;
    p.withResponse = async () => ({
      data,
      response: {
        headers: new Map([['x-cortex-status', 'active']]),
        status: 200,
        ok: true
      }
    });
    return p;
  }
}
