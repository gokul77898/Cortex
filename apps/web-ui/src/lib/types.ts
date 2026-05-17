export type BlockType = 
  | 'heading'
  | 'text'
  | 'code'
  | 'list'
  | 'ordered-list'
  | 'quote'
  | 'warning'
  | 'steps'
  | 'summary'
  | 'output'
  | 'example'
  | 'info'
  | 'divider';

export interface BaseBlock {
  id: string;
  type: BlockType;
}

export interface HeadingBlock extends BaseBlock {
  type: 'heading';
  level: 1 | 2 | 3 | 4;
  content: string;
}

export interface TextBlock extends BaseBlock {
  type: 'text';
  content: string;
}

export interface CodeBlock extends BaseBlock {
  type: 'code';
  language: string;
  content: string;
  filename?: string;
}

export interface ListBlock extends BaseBlock {
  type: 'list' | 'ordered-list';
  items: string[];
}

export interface QuoteBlock extends BaseBlock {
  type: 'quote';
  content: string;
}

export interface WarningBlock extends BaseBlock {
  type: 'warning';
  content: string;
}

export interface StepsBlock extends BaseBlock {
  type: 'steps';
  items: { title: string; description: string }[];
}

export interface SummaryBlock extends BaseBlock {
  type: 'summary';
  content: string;
}

export interface OutputBlock extends BaseBlock {
  type: 'output';
  content: string;
}

export interface ExampleBlock extends BaseBlock {
  type: 'example';
  title: string;
  code?: string;
  explanation?: string;
}

export interface InfoBlock extends BaseBlock {
  type: 'info';
  content: string;
}

export interface DividerBlock extends BaseBlock {
  type: 'divider';
}

export type MessageBlock =
  | HeadingBlock
  | TextBlock
  | CodeBlock
  | ListBlock
  | QuoteBlock
  | WarningBlock
  | StepsBlock
  | SummaryBlock
  | OutputBlock
  | ExampleBlock
  | InfoBlock
  | DividerBlock;

export interface ParsedMessage {
  blocks: MessageBlock[];
}