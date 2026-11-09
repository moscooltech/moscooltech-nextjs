import { Fragment, type ReactNode } from "react";

/**
 * Renders the line-prefix markup used by the seeded articles:
 *   `## ` heading, `### ` subheading, `- ` list item, `**bold**`, blank line.
 *
 * This replaces the Flask `article_html` filter without any raw HTML: the
 * content is parsed into React nodes, so author text can never inject markup.
 */
type Block =
  | { type: "h2" | "h3" | "p"; text: string }
  | { type: "ul"; items: string[] };

function parse(content: string): Block[] {
  const blocks: Block[] = [];
  let list: string[] = [];

  const flush = () => {
    if (list.length) {
      blocks.push({ type: "ul", items: list });
      list = [];
    }
  };

  for (const rawLine of content.replace(/\r\n/g, "\n").split("\n")) {
    const line = rawLine.trim();
    if (!line) {
      flush();
      continue;
    }
    if (line.startsWith("### ")) {
      flush();
      blocks.push({ type: "h3", text: line.slice(4) });
    } else if (line.startsWith("## ")) {
      flush();
      blocks.push({ type: "h2", text: line.slice(3) });
    } else if (line.startsWith("- ")) {
      list.push(line.slice(2));
    } else {
      flush();
      blocks.push({ type: "p", text: line });
    }
  }
  flush();
  return blocks;
}

function withBold(text: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={index}>{part.slice(2, -2)}</strong>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    ),
  );
}

export function ArticleBody({ content }: { content: string }) {
  return (
    <div className="article-body">
      {parse(content).map((block, index) => {
        if (block.type === "ul") {
          return (
            <ul key={index}>
              {block.items.map((item, i) => (
                <li key={i}>{withBold(item)}</li>
              ))}
            </ul>
          );
        }
        if (block.type === "h2") return <h2 key={index}>{withBold(block.text)}</h2>;
        if (block.type === "h3") return <h3 key={index}>{withBold(block.text)}</h3>;
        return <p key={index}>{withBold(block.text)}</p>;
      })}
    </div>
  );
}
