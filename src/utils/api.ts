/**
 * Safe API fetch and JSON parsing utilities.
 * Completely prevents "Unexpected token '<' / unexpected token T in JSON" errors by:
 * 1. Checking if response.ok is true.
 * 2. Checking if response content-type is application/json before running response.json().
 * 3. Gracefully handling HTML error pages, non-JSON text, and network errors.
 * 4. Presenting clear, human-readable error messages.
 */

export interface ApiResponse<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
  rawText?: string;
}

/**
 * Strips HTML tags if a server returns an HTML error page (e.g. 502/504 Bad Gateway or Nginx error)
 */
export function extractTextFromHtml(html: string): string {
  if (!html) return '';
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    return titleMatch[1].trim();
  }
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (h1Match && h1Match[1]) {
    return h1Match[1].trim();
  }
  const stripped = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return stripped.slice(0, 300);
}

/**
 * Safely parses a string as JSON or returns null
 */
export function safeJsonParse<T = any>(str: string): T | null {
  if (!str || typeof str !== 'string') return null;
  const trimmed = str.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return null;
  }
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    return null;
  }
}

/**
 * Executes a fetch request with robust error handling:
 * Checks if response.ok is true and if content-type is application/json before running response.json().
 * If it returns HTML or non-JSON text, catches it gracefully and produces a clean error message.
 */
export async function safeFetchJson<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(input, init);
    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    const isJson = contentType.includes('application/json');

    // Case 1: Server returned HTTP error status (>= 400)
    if (!response.ok) {
      let cleanErrorMessage = `Server request failed (HTTP ${response.status})`;

      if (isJson) {
        try {
          const errData = await response.json();
          cleanErrorMessage =
            errData?.error ||
            errData?.message ||
            `Server returned HTTP error ${response.status}`;
        } catch {
          // If response.json() fails, keep fallback status message
        }
      } else {
        try {
          const rawText = await response.text();
          const readable = extractTextFromHtml(rawText) || rawText.trim().slice(0, 250);
          if (readable) {
            cleanErrorMessage = readable;
          }
        } catch {
          // Failed to read text body
        }
      }

      return {
        ok: false,
        status: response.status,
        data: null,
        error: cleanErrorMessage,
      };
    }

    // Case 2: Server returned 200 OK, but Content-Type is NOT application/json (e.g. HTML or plain text)
    if (!isJson) {
      let cleanMessage = 'Server returned a non-JSON response';
      try {
        const rawText = await response.text();
        const readable = extractTextFromHtml(rawText) || rawText.trim().slice(0, 250);
        if (readable) {
          cleanMessage = readable;
        }
      } catch {
        // Failed to read text body
      }

      return {
        ok: false,
        status: response.status,
        data: null,
        error: cleanMessage,
      };
    }

    // Case 3: Server returned 200 OK with application/json
    try {
      const data = await response.json();
      return {
        ok: true,
        status: response.status,
        data: data as T,
        error: null,
      };
    } catch (jsonParseErr: any) {
      return {
        ok: false,
        status: response.status,
        data: null,
        error: `Could not parse server response as JSON: ${jsonParseErr?.message || 'Invalid format'}`,
      };
    }
  } catch (networkError: any) {
    console.error('Fetch network or execution error:', networkError);
    return {
      ok: false,
      status: 0,
      data: null,
      error: networkError?.message || 'Network connection failed. Please check your internet connection.',
    };
  }
}
