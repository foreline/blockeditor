'use strict';

import {HeadingBlock} from "@/blocks/HeadingBlock";

/**
 * H4 block
 */
export class H4Block extends HeadingBlock
{
    constructor(content = '', html = '', nested = false) {
        super(4, content, html, nested);
    }

    static getMarkdownTriggers() {
        return ['#### '];
    }

    static getToolbarConfig() {
        return {
            class: 'bke-toolbar-header4',
            label: 'Heading 4',
            group: 'headers'
        };
    }
}
