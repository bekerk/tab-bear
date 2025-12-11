import { useEffect, useRef, useState } from "preact/hooks";
import type { CopyPrompt } from "./types";

export const DEFAULT_PROMPTS: CopyPrompt[] = [
  {
    id: "summarize",
    label: "Summarize this",
    template: (content) =>
      `Please summarize the following content:\n\n${content}`,
  },
  {
    id: "analyze",
    label: "Analyze this",
    template: (content) =>
      `Please analyze the following content:\n\n${content}`,
  },
  {
    id: "extract-key-points",
    label: "Extract key points",
    template: (content) =>
      `Please extract the key points from the following content:\n\n${content}`,
  },
  {
    id: "explain",
    label: "Explain this",
    template: (content) =>
      `Please explain the following content in simple terms:\n\n${content}`,
  },
];

type CopyButtonProps = {
  content: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
  style?: Record<string, string>;
  onDownload?: () => void;
};

export const CopyButton = ({
  content,
  label = "Copy to Clipboard",
  copiedLabel = "✓ Copied!",
  className = "",
  style = {},
  onDownload,
}: CopyButtonProps) => {
  const [copied, setCopied] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Reset copied state when button mode changes
  useEffect(() => {
    setCopied(false);
  }, [onDownload]);

  const copyToClipboard = async (prompt?: CopyPrompt) => {
    const text = prompt ? prompt.template(content) : content;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setShowDropdown(false);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMainAction = () => {
    if (onDownload) {
      onDownload();
      setCopied(true);
      setShowDropdown(false);
      setTimeout(() => setCopied(false), 2000);
    } else {
      void copyToClipboard();
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDropdown]);

  return (
    <div class="copy-button-wrapper" ref={dropdownRef}>
      <button
        type="button"
        class={`btn btn-primary copy-button-main ${className}`}
        style={style}
        onClick={handleMainAction}
      >
        {copied ? copiedLabel : label}
      </button>
      <button
        type="button"
        class={`btn btn-primary copy-button-dropdown ${className}`}
        onClick={() => setShowDropdown(!showDropdown)}
        aria-label="More options"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            transform: showDropdown ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 200ms",
          }}
        >
          <path
            d="M4 6L8 10L12 6"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>

      {showDropdown && (
        <div class="copy-dropdown-menu">
          {onDownload && (
            <>
              <div class="copy-dropdown-header">Alternative actions</div>
              <button
                type="button"
                class="copy-dropdown-item"
                onClick={() => void copyToClipboard()}
              >
                Copy to Clipboard
              </button>
              <div class="copy-dropdown-divider"></div>
            </>
          )}
          <div class="copy-dropdown-header">Copy with prompt</div>
          {DEFAULT_PROMPTS.map((prompt) => (
            <button
              key={prompt.id}
              type="button"
              class="copy-dropdown-item"
              onClick={() => void copyToClipboard(prompt)}
            >
              {prompt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
