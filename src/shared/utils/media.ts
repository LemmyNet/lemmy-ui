const imageRegex = /(http)?s?:?(\/\/[^"']*\.(?:jpg|jpeg|gif|png|svg|webp))/;

export function isImage(url: string) {
  return imageRegex.test(url);
}

const videoRegex = /(http)?s?:?(\/\/[^"']*\.(?:mp4|webm|ogv))/;

const audioRegex = /(http)?s?:?(\/\/[^"']*\.(?:mp3|wav|opus|ogg|m4a|flac|spx))/;

export function isVideo(url: string) {
  return videoRegex.test(url);
}

export function isAudio(url: string) {
  return audioRegex.test(url);
}

const magnetLinkRegex = /^magnet:\?xt=urn:btih:[0-9a-fA-F]{40,}.*$/;

export function isMagnetLink(url: string) {
  return magnetLinkRegex.test(url);
}

export function extractMagnetLinkDownloadName(url: string) {
  return new URLSearchParams(url).get("dn");
}
