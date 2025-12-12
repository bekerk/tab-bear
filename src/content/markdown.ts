import TurndownService from "turndown";
import { Readability } from "@mozilla/readability";

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
});

turndown.remove(["script", "style", "noscript", "iframe", "template"]);

export const isValidMarkdownLine = (line: string): boolean => {
  const trimmed = line.trim();

  if (!trimmed) {
    return true;
  }

  const hasLinkedInGarbage =
    trimmed.includes('"$type":"com.linkedin') ||
    trimmed.includes('"entityUrn":"urn:li:') ||
    trimmed.includes('"$recipeTypes":') ||
    trimmed.includes('"lixTracking":') ||
    trimmed.includes("voyager.dash");

  const isLongJson =
    trimmed.length > 800 && (trimmed.match(/"[^"]+":"/g) || []).length > 10;

  return !hasLinkedInGarbage && !isLongJson;
};

export const extractMarkdown = (): string => {
  const documentClone = document.cloneNode(true) as Document;
  const reader = new Readability(documentClone);
  const article = reader.parse();

  const content = article?.content || document.body.innerHTML;
  const title = article?.title || document.title;
  const markdown = turndown.turndown(content);

  const lines = markdown.split("\n");
  const cleaned = lines.filter(isValidMarkdownLine);

  return `# ${title}\n\n${cleaned.join("\n")}`;
};
