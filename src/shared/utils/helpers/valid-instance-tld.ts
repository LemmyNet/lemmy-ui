const tldRegex = /([a-z0-9]+\.)*[a-z0-9]+\.[a-z]+/;

export default function validInstanceTLD(str: string) {
  return tldRegex.test(str);
}
