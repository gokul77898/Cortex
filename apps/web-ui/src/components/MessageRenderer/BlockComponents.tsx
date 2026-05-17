import { motion } from 'framer-motion';
import { AlertTriangle, Info, AlertCircle, Lightbulb } from 'lucide-react';

interface TextBlockProps {
  content: string;
}

export function TextBlock({ content }: TextBlockProps) {
  return (
    <motion.p
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="text-block"
      dangerouslySetInnerHTML={{ 
        __html: content
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/`(.*?)`/g, '<code class="inline-code">$1</code>')
          .replace(/\n/g, '<br/>')
      }}
    />
  );
}

interface HeadingBlockProps {
  level: 1 | 2 | 3 | 4;
  content: string;
}

export function HeadingBlock({ level, content }: HeadingBlockProps) {
  const classes = {
    1: 'heading-1',
    2: 'heading-2',
    3: 'heading-3',
    4: 'heading-4',
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`heading-block ${classes[level]}`}
    >
      {content}
    </motion.div>
  );
}

interface InfoBlockProps {
  content: string;
}

const iconMap: Record<string, string> = {
  '⚠️': 'warning',
  '⚡': 'info',
  '💡': 'tip',
  '📝': 'note',
  '❗': 'warning',
  '❓': 'question',
  '🔔': 'alert',
  'ℹ️': 'info',
  '✅': 'success',
  '❌': 'error',
};

export function InfoBlock({ content }: InfoBlockProps) {
  const icon = Object.keys(iconMap).find(k => content.startsWith(k)) || '💡';
  const type = iconMap[icon] || 'info';
  const cleanContent = content.replace(/^[⚠️⚡💡📝❗❓🔔ℹ️✅❌]\s*/, '');
  
  const icons = {
    warning: AlertTriangle,
    info: Info,
    tip: Lightbulb,
    note: Info,
    question: AlertCircle,
    alert: AlertCircle,
    success: Info,
    error: AlertCircle,
  };
  
  const Icon = icons[type] || Info;
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={`info-block info-${type}`}
    >
      <Icon className="info-icon" />
      <span className="info-content">{cleanContent}</span>
    </motion.div>
  );
}

interface WarningBlockProps {
  content: string;
}

export function WarningBlock({ content }: WarningBlockProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="warning-block"
    >
      <AlertTriangle className="warning-icon" />
      <div 
        className="warning-content"
        dangerouslySetInnerHTML={{ 
          __html: content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/`(.*?)`/g, '<code class="inline-code">$1</code>')
            .replace(/\n/g, '<br/>')
        }}
      />
    </motion.div>
  );
}

interface SummaryBlockProps {
  content: string;
}

export function SummaryBlock({ content }: SummaryBlockProps) {
  const items = content.split('\n').filter(l => l.trim());
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="summary-block"
    >
      <div className="summary-header">
        <span className="summary-label">Summary</span>
      </div>
      <ul className="summary-list">
        {items.map((item, idx) => (
          <li key={idx}>
            <span className="summary-bullet" />
            <span dangerouslySetInnerHTML={{ 
              __html: item
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/`(.*?)`/g, '<code class="inline-code">$1</code>')
            }} />
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

interface OutputBlockProps {
  content: string;
}

export function OutputBlock({ content }: OutputBlockProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="output-block"
    >
      <div className="output-header">
        <span className="output-label">Output</span>
      </div>
      <pre className="output-content">{content}</pre>
    </motion.div>
  );
}

interface QuoteBlockProps {
  content: string;
}

export function QuoteBlock({ content }: QuoteBlockProps) {
  return (
    <motion.blockquote
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      className="quote-block"
    >
      {content}
    </motion.blockquote>
  );
}

export function DividerBlock() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="divider-block"
    />
  );
}