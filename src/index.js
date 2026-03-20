/**
 * JS Editor - Universal Library Entry Point
 * A modern WYSIWYG editor with block-based architecture
 */

// Main classes
export { Editor } from './Editor.js';
export { Block } from './Block.js';
export { BlockType } from './BlockType.js';
export { Toolbar } from './Toolbar.js';
export { Parser } from './Parser.js';
export { KeyHandler } from './KeyHandler.js';
export { Utils } from './Utils.js';
export { DebugTooltip } from './DebugTooltip.js';

// Block types
export { BlockFactory } from './blocks/BlockFactory.js';
export { BaseBlock } from './blocks/BaseBlock.js';
export { ParagraphBlock } from './blocks/ParagraphBlock.js';
export { HeadingBlock } from './blocks/HeadingBlock.js';
export { H1Block } from './blocks/H1Block.js';
export { H2Block } from './blocks/H2Block.js';
export { H3Block } from './blocks/H3Block.js';
export { H4Block } from './blocks/H4Block.js';
export { H5Block } from './blocks/H5Block.js';
export { H6Block } from './blocks/H6Block.js';
export { ListBlock } from './blocks/ListBlock.js';
export { UnorderedListBlock } from './blocks/UnorderedListBlock.js';
export { OrderedListBlock } from './blocks/OrderedListBlock.js';
export { TaskListBlock } from './blocks/TaskListBlock.js';
export { QuoteBlock } from './blocks/QuoteBlock.js';
export { CodeBlock } from './blocks/CodeBlock.js';
export { TableBlock } from './blocks/TableBlock.js';
export { ImageBlock } from './blocks/ImageBlock.js';
export { DelimiterBlock } from './blocks/DelimiterBlock.js';

// Events
export { EditorEventEmitter, EVENTS } from './utils/eventEmitter.js';

// State machine
export { EditorStateMachine, EditorState } from './utils/EditorStateMachine.js';

// Interfaces
export { BlockInterfaceContract as BlockInterface } from './interfaces/BlockInterface.js';

// Default export for convenience
export { Editor as default } from './Editor.js';

// Version
export const VERSION = '0.0.1';
