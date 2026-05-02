'use strict';

import {HeadingBlock} from "@/blocks/HeadingBlock";

/**
 * H2 block
 */
export class H2Block extends HeadingBlock
{
    constructor(content = '', html = '', nested = false) {
        super(2, content, html, nested);
    }

    static getMarkdownTriggers() {
        return ['## '];
    }

    static getToolbarConfig() {
        return {
            class: 'bke-toolbar-header2',
            label: 'Heading 2',
            group: 'headers'
        };
    }
}
