export default async function fetchThemeList(): Promise<string[]> {
  return fetch("/css/themelist").then(res => res.json());
}
