import fetch from "cross-fetch";

export async function fetchIconPng(iconUrl: string) {
  return await fetch(iconUrl)
    .then(res => res.blob())
    .then(blob => blob.arrayBuffer());
}
