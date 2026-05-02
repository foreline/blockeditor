/**
 * TypeScript declarations for JS Editor
 */

declare module '@foreline/blockeditor' {

  // Event name union
  export type EditorEventName =
    | 'content.changed'
    | 'editor.updated'
    | 'block.content.changed'
    | 'focus'
    | 'blur';

  // Typed event payloads
  export interface ContentChangedPayload {
    html: string;
    markdown: string;
    timestamp: number;
  }

  export interface BlockContentChangedPayload {
    blockId: string;
    blockType: string;
    content: string;
    previousContent: string;
    timestamp: number;
  }

  export interface EditorOptions {
    id: string;
    placeholder?: string;
    debug?: boolean;
    autofocus?: boolean;
    readonly?: boolean;
    minHeight?: string;
    maxHeight?: string;
    toolbar?: boolean | ToolbarOptions;
    markdown?: string;
    html?: string;
  }

  export interface ToolbarOptions {
    groups?: string[];
    sticky?: boolean;
    hideOnFocus?: boolean;
  }

  export interface BlockData {
    type: string;
    content: string;
    data?: Record<string, any>;
  }

  export class Editor {
    constructor(options: EditorOptions);
    
    // Static methods
    static getInstance(id: string): Editor | null;
    static getAllInstances(): Map<string, Editor>;
    static destroyInstance(id: string): boolean;
    
    // Instance methods
    getMarkdown(): string;
    getHtml(): string;
    getBlocks(): Block[];
    setMarkdown(markdown: string): void;
    setHtml(html: string): void;
    clear(): void;
    focus(): void;
    blur(): void;
    destroy(): void;
    
    // Event methods
    on(event: 'content.changed', callback: (data: ContentChangedPayload) => void): void;
    on(event: 'block.content.changed', callback: (data: BlockContentChangedPayload) => void): void;
    on(event: 'focus' | 'blur', callback: () => void): void;
    on(event: EditorEventName, callback: Function): void;
    off(event: string, callback?: Function): void;
    emit(event: string, data?: any): void;

    // Transaction
    transaction<T>(fn: () => T): T;
    
    // Properties
    readonly id: string;
    readonly element: HTMLElement;
    readonly blocks: Block[];
    readonly toolbar: Toolbar | null;
  }

  export class Block {
    constructor(element: HTMLElement, type: string);
    
    getType(): string;
    getContent(): string;
    setContent(content: string): void;
    getData(): Record<string, any>;
    setData(data: Record<string, any>): void;
    focus(): void;
    remove(): void;
    
    readonly element: HTMLElement;
    readonly type: string;
  }

  export class BlockType {
    static PARAGRAPH: string;
    static H1: string;
    static H2: string;
    static H3: string;
    static H4: string;
    static H5: string;
    static H6: string;
    static UNORDERED_LIST: string;
    static ORDERED_LIST: string;
    static TASK_LIST: string;
    static QUOTE: string;
    static CODE: string;
    static TABLE: string;
    static IMAGE: string;
    static DELIMITER: string;
  }

  export class Toolbar {
    constructor(editor: Editor, options?: ToolbarOptions);
    
    show(): void;
    hide(): void;
    toggle(): void;
    destroy(): void;
    
    readonly element: HTMLElement;
    readonly editor: Editor;
  }

  export class Parser {
    static markdownToBlocks(markdown: string): BlockData[];
    static blocksToMarkdown(blocks: Block[]): string;
    static htmlToBlocks(html: string): BlockData[];
    static blocksToHtml(blocks: Block[]): string;
  }

  export class Utils {
    static sanitizeHtml(html: string): string;
    static escapeHtml(text: string): string;
    static unescapeHtml(html: string): string;
    static debounce(func: Function, wait: number): Function;
    static throttle(func: Function, limit: number): Function;
  }

  export const VERSION: string;

  // Default export
  export default Editor;
}
