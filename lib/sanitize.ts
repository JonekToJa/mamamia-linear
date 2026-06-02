import sanitizeHtml from "sanitize-html";

export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ["b", "i", "em", "strong", "u", "a", "p", "br", "ul", "ol", "li"],
    allowedAttributes: {
      a: ["href", "target", "rel"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        target: "_blank",
        rel: "noopener noreferrer nofollow",
      }),
    },
  });
}
