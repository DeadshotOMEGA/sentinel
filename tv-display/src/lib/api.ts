/**
 * API client utility for TV display
 * Adds display authentication header to all requests
 */

export const DISPLAY_API_KEY = import.meta.env.VITE_DISPLAY_API_KEY;

if (!DISPLAY_API_KEY) {
  throw new Error('VITE_DISPLAY_API_KEY environment variable is not set');
}

interface FetchOptions extends RequestInit {
  headers?: HeadersInit;
}

/**
 * Authenticated fetch for TV display
 * Automatically adds X-Display-API-Key header
 */
export async function authenticatedFetch(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const headers = new Headers(options.headers);

  if (DISPLAY_API_KEY) {
    headers.set('X-Display-API-Key', DISPLAY_API_KEY);
  }

  return fetch(url, {
    ...options,
    headers,
  });
}
