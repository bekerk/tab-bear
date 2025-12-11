import TurndownService from "turndown";

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
  const markdown = turndown.turndown(document.body);

  const lines = markdown.split("\n");
  const cleaned = lines.filter(isValidMarkdownLine);

  return `# ${document.title}\n\n${cleaned.join("\n")}`;
};
