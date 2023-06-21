export default function validTitle(title?: string): boolean {
  // Initial title is null, minimum length is taken care of by textarea's minLength={3}
  if (!title || title.length < 3) return true;

  const regex = new RegExp(/.*\S.*/, "g");

  return regex.test(title);
}
