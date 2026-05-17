import { motion, AnimatePresence } from 'framer-motion';
import { MessageBlock } from '@/lib/types';
import { parseMessageToBlocks } from '@/lib/parser';
import { CodeBlock } from './CodeBlock';
import { 
  TextBlock, 
  HeadingBlock, 
  InfoBlock, 
  WarningBlock, 
  SummaryBlock, 
  OutputBlock,
  QuoteBlock,
  DividerBlock 
} from './BlockComponents';

interface MessageRendererProps {
  content: string;
  isStreaming?: boolean;
}

export function MessageRenderer({ content, isStreaming = false }: MessageRendererProps) {
  const blocks = parseMessageToBlocks(content);
  
  return (
    <div className="message-blocks">
      <AnimatePresence>
        {blocks.map((block, index) => (
          <motion.div
            key={block.id}
            initial={isStreaming ? { opacity: 0, y: 10 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            {renderBlock(block)}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function renderBlock(block: MessageBlock) {
  switch (block.type) {
    case 'heading':
      return <HeadingBlock level={block.level} content={block.content} />;
    case 'text':
      return <TextBlock content={block.content} />;
    case 'code':
      return <CodeBlock language={block.language} content={block.content} filename={block.filename} />;
    case 'info':
      return <InfoBlock content={block.content} />;
    case 'warning':
      return <WarningBlock content={block.content} />;
    case 'summary':
      return <SummaryBlock content={block.content} />;
    case 'output':
      return <OutputBlock content={block.content} />;
    case 'quote':
      return <QuoteBlock content={block.content} />;
    case 'divider':
      return <DividerBlock />;
    default:
      return <TextBlock content={(block as any).content || ''} />;
  }
}