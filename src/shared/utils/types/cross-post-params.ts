import StringBoolean from "./string-boolean";

export default interface CrossPostParams {
  name: string;
  url?: string;
  body?: string;
  altText?: string;
  nsfw?: StringBoolean;
  languageId?: number;
}
