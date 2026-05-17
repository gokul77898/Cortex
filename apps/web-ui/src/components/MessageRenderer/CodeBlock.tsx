import { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, FileCode2 } from 'lucide-react';

interface CodeBlockProps {
  language: string;
  content: string;
  filename?: string;
  showLineNumbers?: boolean;
}

const languageLabels: Record<string, string> = {
  js: 'JavaScript',
  javascript: 'JavaScript',
  ts: 'TypeScript',
  typescript: 'TypeScript',
  python: 'Python',
  py: 'Python',
  pyw: 'Python',
  rust: 'Rust',
  rs: 'Rust',
  go: 'Go',
  golang: 'Go',
  java: 'Java',
  c: 'C',
  cpp: 'C++',
  'c++': 'C++',
  cs: 'C#',
  'c#': 'C#',
  ruby: 'Ruby',
  rb: 'Ruby',
  php: 'PHP',
  swift: 'Swift',
  kotlin: 'Kotlin',
  scala: 'Scala',
  html: 'HTML',
  css: 'CSS',
  scss: 'SCSS',
  sql: 'SQL',
  bash: 'Bash',
  sh: 'Shell',
  shell: 'Shell',
  json: 'JSON',
  yaml: 'YAML',
  yml: 'YAML',
  xml: 'XML',
  markdown: 'Markdown',
  md: 'Markdown',
  dockerfile: 'Dockerfile',
  text: 'Code',
  code: 'Code',
};

// Simple syntax highlighting without Shiki (to avoid complexity)
const highlightCode = (code: string, language: string): string => {
  const keywords = ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export', 'from', 'async', 'await', 'try', 'catch', 'throw', 'new', 'this', 'def', 'print', 'self', 'None', 'True', 'False', 'fn', 'pub', 'impl', 'struct', 'enum', 'use', 'mod', 'package', 'func', 'type', 'interface', 'map', 'range'];
  const strings = code.match(/(["'`])(?:(?!\1)[^\\]|\\.)*\1/g) || [];
  const numbers = code.match(/\b\d+\.?\d*\b/g) || [];
  
  let highlighted = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // Highlight strings
  strings.forEach(str => {
    const escaped = str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    highlighted = highlighted.replace(new RegExp(escaped, 'g'), `<span class="token string">${str}</span>`);
  });
  
  // Highlight keywords
  keywords.forEach(kw => {
    const regex = new RegExp(`\\b(${kw})\\b`, 'g');
    highlighted = highlighted.replace(regex, '<span class="token keyword">$1</span>');
  });
  
  // Highlight numbers
  numbers.forEach(num => {
    const regex = new RegExp(`\\b(${num})\\b`, 'g');
    highlighted = highlighted.replace(regex, '<span class="token number">$1</span>');
  });
  
  return highlighted;
};

export function CodeBlock({ language, content, filename, showLineNumbers = true }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  
  const displayLang = languageLabels[language.toLowerCase()] || language.toUpperCase();
  const lines = content.split('\n');
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="code-block-wrapper group"
    >
      <div className="code-block-header">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500/80" />
            <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <span className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          {filename && (
            <div className="flex items-center gap-2 text-white/60">
              <FileCode2 className="w-4 h-4" />
              <span className="text-sm font-mono">{filename}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="code-language">{displayLang}</span>
          <button
            onClick={handleCopy}
            className="copy-button"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>
      </div>
      <div className="code-block-content">
        {showLineNumbers ? (
          <div className="code-with-lines">
            <div className="line-numbers">
              {lines.map((_, idx) => (
                <span key={idx} className="line-number">{idx + 1}</span>
              ))}
            </div>
            <pre className="code-pre">
              <code 
                className="code-content"
                dangerouslySetInnerHTML={{ __html: highlightCode(content, language) }}
              />
            </pre>
          </div>
        ) : (
          <pre className="code-pre">
            <code 
              className="code-content"
              dangerouslySetInnerHTML={{ __html: highlightCode(content, language) }}
            />
          </pre>
        )}
      </div>
    </motion.div>
  );
}