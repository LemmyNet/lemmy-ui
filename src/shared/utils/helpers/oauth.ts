export function base64URLEncode(buffer: Uint8Array | ArrayBuffer) {
  return btoa(String.fromCharCode.apply(null, new Uint8Array(buffer)))
    .replace(/\//g, "_")
    .replace(/\+/g, "-")
    .replace(/=/g, "");
}

export function generateCodeVerifier(length: number = 64) {
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);
  return base64URLEncode(array);
}

export async function createCodeChallenge(codeVerifier: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  return base64URLEncode(digest);
}
