"use client";

import { Fragment, ReactNode } from "react";

interface MarkdownTextProps {
  text: string;
  className?: string;
  showCursor?: boolean;
}

function parseInlineMarkdown(text: string): ReactNode[] {
  const tokenRegex = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*|\[[^\]]+\]\((?:https?:\/\/[^\s)]+)\))/g;
  const tokens = text.split(tokenRegex);

  return tokens
    .filter((token): token is string => typeof token === "string" && token.length > 0)
    .map((token, index) => {
      if (token.startsWith("**") && token.endsWith("**")) {
        return <strong key={`md-${index}`}>{token.slice(2, -2)}</strong>;
      }
      if (token.startsWith("`") && token.endsWith("`")) {
        return (
          <code
            key={`md-${index}`}
            className="rounded bg-zinc-100 px-1 py-0.5 text-[0.92em] font-mono"
          >
            {token.slice(1, -1)}
          </code>
        );
      }
      if (token.startsWith("*") && token.endsWith("*")) {
        return <em key={`md-${index}`}>{token.slice(1, -1)}</em>;
      }

      const linkMatch = token.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
      if (linkMatch) {
        return (
          <a
            key={`md-${index}`}
            href={linkMatch[2]}
            target="_blank"
            rel="noreferrer noopener"
            className="text-brand-primary underline underline-offset-2"
          >
            {linkMatch[1]}
          </a>
        );
      }

      return <Fragment key={`md-${index}`}>{token}</Fragment>;
    });
}

export default function MarkdownText({ text, className, showCursor = false }: MarkdownTextProps) {
  const lines = text.split("\n");
  const nodes: ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      nodes.push(<div key={`spacer-${i}`} className="h-2" />);
      i += 1;
      continue;
    }

    if (trimmed.startsWith(">")) {
      nodes.push(
        <blockquote key={`quote-${i}`} className="border-l-2 border-zinc-300 pl-3 text-zinc-700">
          {parseInlineMarkdown(trimmed.slice(1).trim())}
        </blockquote>
      );
      i += 1;
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items: ReactNode[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        const itemText = lines[i].trim().replace(/^[-*]\s+/, "");
        items.push(<li key={`li-${i}`}>{parseInlineMarkdown(itemText)}</li>);
        i += 1;
      }
      nodes.push(
        <ul key={`ul-${i}`} className="list-disc space-y-1 pl-5">
          {items}
        </ul>
      );
      continue;
    }

    nodes.push(
      <p key={`p-${i}`} className="leading-relaxed">
        {parseInlineMarkdown(line)}
      </p>
    );
    i += 1;
  }

  return (
    <div className={className}>
      {nodes}
      {showCursor && (
        <span className="inline-block h-4 w-1.5 animate-pulse align-middle bg-brand-primary ml-1"></span>
      )}
    </div>
  );
}
