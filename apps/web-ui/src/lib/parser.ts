import { MessageBlock, BlockType } from './types';

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function detectBlockType(line: string): BlockType | null {
  const trimmed = line.trim();
  
  // Headings
  if (/^#{1,4}\s/.test(trimmed)) {
    return 'heading';
  }
  
  // Warning/Note/Info blocks
  if (/^(⚠️|⚡|💡|📝|❗|❓|🔔|ℹ️|✅|❌)/.test(trimmed)) {
    return 'info';
  }
  
  // Quote
  if (/^>\s/.test(trimmed)) {
    return 'quote';
  }
  
  // Divider
  if (/^---+$/.test(trimmed) || /^___+$/.test(trimmed)) {
    return 'divider';
  }
  
  // Numbered list (1. 2. etc.)
  if (/^\d+\.\s/.test(trimmed)) {
    return 'ordered-list';
  }
  
  // Bullet list (- or *)
  if (/^[-*]\s/.test(trimmed)) {
    return 'list';
  }
  
  return null;
}

function parseCodeBlock(text: string): { language: string; content: string; filename?: string } {
  const codeBlockMatch = text.match(/```(\w+)?(?::(\S+))?\n?([\s\S]*?)```/);
  
  if (codeBlockMatch) {
    return {
      language: codeBlockMatch[1] || 'text',
      filename: codeBlockMatch[2],
      content: codeBlockMatch[3].trim()
    };
  }
  
  return { language: 'text', content: text };
}

function detectSectionType(content: string): BlockType {
  const lower = content.toLowerCase();
  
  // Summary sections
  if (lower.includes('summary') || lower.includes('recap') || lower.includes('wrap-up')) {
    return 'summary';
  }
  
  // Warning
  if (lower.includes('warning') || lower.includes('caution') || lower.includes('important')) {
    return 'warning';
  }
  
  // Steps
  if (lower.includes('step') || lower.includes('instructions') || lower.includes('how to')) {
    return 'steps';
  }
  
  // Output
  if (lower.includes('output') || lower.includes('result') || lower.includes('expected')) {
    return 'output';
  }
  
  // Example
  if (lower.includes('example') || lower.includes('usage') || lower.includes('demo')) {
    return 'example';
  }
  
  return 'text';
}

export function parseMessageToBlocks(rawText: string): MessageBlock[] {
  const blocks: MessageBlock[] = [];
  const lines = rawText.split('\n');
  
  let i = 0;
  let currentTextBlock = '';
  let inCodeBlock = false;
  let codeLanguage = '';
  let codeContent = '';
  
  while (i < lines.length) {
    const line = lines[i];
    
    // Code block start
    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        // Flush current text block
        if (currentTextBlock.trim()) {
          const type = detectSectionType(currentTextBlock);
          if (type === 'summary') {
            blocks.push({
              id: generateId(),
              type: 'summary',
              content: currentTextBlock.trim()
            });
          } else if (type === 'warning') {
            blocks.push({
              id: generateId(),
              type: 'warning',
              content: currentTextBlock.trim()
            });
          } else {
            blocks.push({
              id: generateId(),
              type: 'text',
              content: currentTextBlock.trim()
            });
          }
          currentTextBlock = '';
        }
        
        inCodeBlock = true;
        codeLanguage = line.slice(3).trim() || 'code';
        codeContent = '';
      } else {
        // End of code block
        blocks.push({
          id: generateId(),
          type: 'code',
          language: codeLanguage,
          content: codeContent.trim()
        });
        inCodeBlock = false;
        codeContent = '';
      }
      i++;
      continue;
    }
    
    if (inCodeBlock) {
      codeContent += line + '\n';
      i++;
      continue;
    }
    
    // Check for section headers that indicate new blocks
    const sectionMatch = line.match(/^(#{1,3})\s+(.+?)(?:\s*[-:])?\s*$/);
    if (sectionMatch) {
      // Flush current text
      if (currentTextBlock.trim()) {
        blocks.push({
          id: generateId(),
          type: 'text',
          content: currentTextBlock.trim()
        });
        currentTextBlock = '';
      }
      
      const level = sectionMatch[1].length as 1 | 2 | 3;
      const content = sectionMatch[2].trim();
      
      // Check if it's a special section
      const lowerContent = content.toLowerCase();
      
      if (lowerContent.includes('summary') || lowerContent.includes('wrap up') || lowerContent.includes('recap')) {
        // Collect summary content
        let summaryContent = '';
        i++;
        while (i < lines.length && !lines[i].match(/^#{1,3}\s/) && lines[i].trim()) {
          summaryContent += lines[i] + '\n';
          i++;
        }
        blocks.push({
          id: generateId(),
          type: 'summary',
          content: summaryContent.trim()
        });
        continue;
      }
      
      if (lowerContent.includes('output') || lowerContent.includes('result')) {
        let outputContent = '';
        i++;
        while (i < lines.length && !lines[i].match(/^#{1,3}\s/) && lines[i].trim()) {
          outputContent += lines[i] + '\n';
          i++;
        }
        blocks.push({
          id: generateId(),
          type: 'output',
          content: outputContent.trim()
        });
        continue;
      }
      
      blocks.push({
        id: generateId(),
        type: 'heading',
        level,
        content
      });
      i++;
      continue;
    }
    
    // Check for special block indicators
    const blockType = detectBlockType(line);
    if (blockType === 'divider') {
      if (currentTextBlock.trim()) {
        blocks.push({
          id: generateId(),
          type: 'text',
          content: currentTextBlock.trim()
        });
        currentTextBlock = '';
      }
      blocks.push({ id: generateId(), type: 'divider' });
      i++;
      continue;
    }
    
    if (blockType === 'info') {
      if (currentTextBlock.trim()) {
        blocks.push({
          id: generateId(),
          type: 'text',
          content: currentTextBlock.trim()
        });
        currentTextBlock = '';
      }
      blocks.push({
        id: generateId(),
        type: 'info',
        content: line.replace(/^(⚇|⚡|💡|📝|❗|❓|🔔|ℹ️|✅|❌)\s*/, '').trim()
      });
      i++;
      continue;
    }
    
    // Regular text - accumulate
    if (line.trim()) {
      currentTextBlock += line + '\n';
    } else if (currentTextBlock.trim()) {
      // Empty line - flush current text
      const type = detectSectionType(currentTextBlock);
      if (type === 'summary') {
        blocks.push({
          id: generateId(),
          type: 'summary',
          content: currentTextBlock.trim()
        });
      } else if (type === 'warning') {
        blocks.push({
          id: generateId(),
          type: 'warning',
          content: currentTextBlock.trim()
        });
      } else {
        blocks.push({
          id: generateId(),
          type: 'text',
          content: currentTextBlock.trim()
        });
      }
      currentTextBlock = '';
    }
    
    i++;
  }
  
  // Flush remaining
  if (currentTextBlock.trim()) {
    const type = detectSectionType(currentTextBlock);
    if (type === 'summary') {
      blocks.push({
        id: generateId(),
        type: 'summary',
        content: currentTextBlock.trim()
      });
    } else if (type === 'warning') {
      blocks.push({
        id: generateId(),
        type: 'warning',
        content: currentTextBlock.trim()
      });
    } else {
      blocks.push({
        id: generateId(),
        type: 'text',
        content: currentTextBlock.trim()
      });
    }
  }
  
  return blocks;
}