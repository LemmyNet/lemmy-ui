const videoRegex = /(http)?s?:?(\/\/[^"']*\.(?:mp4|webm))/;

export default function isVideo(url: string) {
  return videoRegex.test(url);
}
