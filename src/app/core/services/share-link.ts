import { emptyStats, isComplete, Quiz } from '../model/quiz.model';
import { parseQuizJson } from '../parsers/json-parser';
import { writeQuizJson } from '../parsers/json-writer';

/**
 * Share links carry the whole quiz in the URL fragment, which browsers never
 * send to a server: `#/share/<code>`. The code is the JSON export format
 * without progress, deflate-compressed and base64url-encoded, prefixed with a
 * format version so the encoding can change later.
 */
const VERSION = '1';

export class ShareLinkError extends Error {
  constructor() {
    super('broken share link');
    this.name = 'ShareLinkError';
  }
}

export async function encodeQuiz(quiz: Quiz): Promise<string> {
  const shareable: Quiz = {
    ...quiz,
    results: [],
    items: quiz.items.filter(isComplete).map((i) => ({ ...i, checked: false, stats: emptyStats() })),
  };
  const json = JSON.stringify(JSON.parse(writeQuizJson(shareable)));
  const compressed = await transform(new TextEncoder().encode(json), new CompressionStream('deflate-raw'));
  return VERSION + toBase64Url(compressed);
}

/** Throws ShareLinkError when the code is cut off, damaged, or not a quiz. */
export async function decodeQuiz(code: string): Promise<Quiz> {
  if (!code.startsWith(VERSION)) {
    throw new ShareLinkError();
  }
  try {
    const bytes = await transform(fromBase64Url(code.slice(VERSION.length)), new DecompressionStream('deflate-raw'));
    const quiz = parseQuizJson(new TextDecoder().decode(bytes), '');
    return { ...quiz, fileName: '' };
  } catch {
    throw new ShareLinkError();
  }
}

export function shareUrl(code: string, location: Pick<Location, 'origin' | 'pathname'> = window.location): string {
  return `${location.origin}${location.pathname}#/share/${code}`;
}

async function transform(
  bytes: Uint8Array<ArrayBuffer>,
  stream: CompressionStream | DecompressionStream,
): Promise<Uint8Array<ArrayBuffer>> {
  const output = new Response(bytes).body!.pipeThrough(stream);
  return new Uint8Array(await new Response(output).arrayBuffer());
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> {
  const base64 = text.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}
