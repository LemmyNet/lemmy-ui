const matchEscHtmlRx = /["'&<>]/;
const matchUnEscRx = /&(?:amp|#38|lt|#60|gt|#62|apos|#39|quot|#34);/g;

export function escapeHTML(str: string): string {
  const matchEscHtml = matchEscHtmlRx.exec(str);
  if (!matchEscHtml) {
    return str;
  }
  let escape;
  let html = "";
  let index = 0;
  let lastIndex = 0;
  for (index = matchEscHtml.index; index < str.length; index++) {
    switch (str.charCodeAt(index)) {
      case 34: // "
        escape = "&quot;";
        break;
      case 38: // &
        escape = "&amp;";
        break;
      case 39: // '
        escape = "&#39;";
        break;
      case 60: // <
        escape = "&lt;";
        break;
      case 62: // >
        escape = "&gt;";
        break;
      default:
        continue;
    }

    if (lastIndex !== index) {
      html += str.substring(lastIndex, index);
    }

    lastIndex = index + 1;
    html += escape;
  }

  return lastIndex !== index ? html + str.substring(lastIndex, index) : html;
}

export function unescapeHTML(str: string | undefined): string {
  const matchUnEsc = matchUnEscRx.exec(str);
  if (!matchUnEsc) {
    return str;
  }

  const res = str
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x3A;/g, ":")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

  return unescapeHTML(res);
}
