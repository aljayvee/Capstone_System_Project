import axios from "axios";

/**
 * The API answers refusals as { error } (not { message }). A request with no
 * response never reached it. Anything else gets the caller's fallback.
 */
export function apiErrorText(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const serverText = (err.response?.data as { error?: unknown } | undefined)?.error;
    if (typeof serverText === "string" && serverText.trim()) return serverText;
    if (!err.response) return "Could not reach the server. Check the connection and try again.";
  }
  return fallback;
}
