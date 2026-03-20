'use strict';

/**
 * Block types enumeration.
 * @readonly
 */
export class BlockType
{
    static H1 = 'h1';
    static H2 = 'h2';
    static H3 = 'h3';
    static H4 = 'h4';
    static H5 = 'h5';
    static H6 = 'h6';
    static PARAGRAPH = 'paragraph';
    static CODE = 'code';
    static DELIMITER = 'delimiter';
    static QUOTE = 'quote';
    static UL = 'ul';
    static OL = 'ol';
    static SQ = 'sq';
    static TABLE = 'table';
    static IMAGE = 'image';

    /**
     * Get the block type from an HTML tag.
     * @param {string} tag
     * @returns {string}
     */
    static getBlockTypeFromHtmlTag(tag)
    {        
        switch (tag.toLowerCase()) {
            case 'h1':
                return BlockType.H1;
            case 'h2':
                return BlockType.H2;
            case 'h3':
                return BlockType.H3;
            case 'h4':
                return BlockType.H4;
            case 'h5':
                return BlockType.H5;
            case 'h6':
                return BlockType.H6;
            case 'p':
                return BlockType.PARAGRAPH;
            case 'code':
                return BlockType.CODE;
            case 'pre':
                return BlockType.CODE;
            case 'blockquote':
                return BlockType.QUOTE;
            case 'ul':
                return BlockType.UL;
            case 'ol':
                return BlockType.OL;
            case 'sq':
                return BlockType.SQ;
            case 'table':
                return BlockType.TABLE;
            case 'img':
                return BlockType.IMAGE;
            case 'image':
                return BlockType.IMAGE;
            default:
                return BlockType.PARAGRAPH;
        }
    }

    /**
     * @returns {string[]}
     * @description Returns all block types as an array.
     */
    static getAll() {
        return [
            BlockType.H1,
            BlockType.H2,
            BlockType.H3,
            BlockType.H4,
            BlockType.H5,
            BlockType.H6,
            BlockType.PARAGRAPH,
            BlockType.CODE,
            BlockType.DELIMITER,
            BlockType.QUOTE,
            BlockType.UL,
            BlockType.OL,
            BlockType.SQ,
            BlockType.TABLE,
            BlockType.IMAGE
        ];
    }

    static isValid(type) {
        return BlockType.getAll().includes(type);
    }

    /**
     * Check if the block type is a heading.
     * @param {string} type
     * @returns {boolean}
     */
    static isHeading(type) {
        return [BlockType.H1, BlockType.H2, BlockType.H3, BlockType.H4, BlockType.H5, BlockType.H6].includes(type);
    }

    /**
     * Check if the block type is a list.
     * @param {string} type
     * @returns {boolean}
     */
    static isList(type) {
        return [BlockType.UL, BlockType.OL, BlockType.SQ].includes(type);
    }

    /**
     * Check if the block type is a specific type of block.
     * @param {string} type
     * @returns {boolean}
     */
    static isBlock(type) {
        return BlockType.getAll().includes(type);
    }

    /**
     * Check if the block type is a quote.
     * @param {string} type
     * @returns {boolean}
     */
    static isQuote(type) {
        return type === BlockType.QUOTE;
    }

    /**
     * Check if the block type is a paragraph.
     * @param {string} type
     * @returns {boolean}
     */
    static isParagraph(type) {
        return type === BlockType.PARAGRAPH;
    }

    /**
     * Check if the block type is a code block, delimiter, or quote.
     * @param {string} type
     * @returns {boolean}
     */
    static isCode(type) {
        return type === BlockType.CODE;
    }

    /**
     * Check if the block type is a delimiter.
     * @param {string} type
     * @returns {boolean}
     */
    static isDelimiter(type) {
        return type === BlockType.DELIMITER;
    }

    /**
     * Check if the block type is a quote.
     * @param {string} type
     * @returns {boolean}
     */
    static isQuote(type) {
        return type === BlockType.QUOTE;
    }

}