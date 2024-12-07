const magnetLinkRegex = /^magnet:\?xt=urn:btih:[0-9a-fA-F]{40,}.*$/;

export default function isMagnetLink(url: string) {
  return magnetLinkRegex.test(url);
}

export function extractMagnetLinkDownloadName(url: string) {
  return new URLSearchParams(url).get("dn");
}
