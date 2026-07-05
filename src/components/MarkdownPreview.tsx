import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MarkdownPreview({ content }: { content: string }) {
  return (
    <div className="prose max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}