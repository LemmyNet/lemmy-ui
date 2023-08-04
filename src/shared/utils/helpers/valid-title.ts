export default function validTitle(title?: string): boolean {
  // Initial title is null, minimum length is taken care of by textarea's minLength={3}
  if (!title || title.length < 3) return true;

  /*
    Test if the Title is in a valid format:
      (?=.*\S.*) checks if the title consists of only whitespace characters
      (?=^[^\r\n]+$) checks if the title contains newlines 
  */
  const regex = new RegExp(/(?=(.*\S.*))(?=^[^\r\n]+$)/, "g");

  return regex.test(title);
}
