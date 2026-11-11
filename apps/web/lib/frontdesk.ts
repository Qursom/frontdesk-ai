/** The small API that public/loader.js puts on window. */
export interface FrontDeskApi {
  open(opts?: { message?: string }): void;
  close(): void;
}

declare global {
  interface Window {
    FrontDesk?: FrontDeskApi;
  }
}

/**
 * Open the chat with a pre-filled message.
 * If the loader is blocked or not loaded yet, fall back to the contact section so the button still does something.
 */
export function openChat(message: string, fallbackHash = 'contact') {
  if (window.FrontDesk) window.FrontDesk.open({ message });
  else window.location.hash = fallbackHash;
}
