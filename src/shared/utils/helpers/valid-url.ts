export default function validURL(str: string) {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}
