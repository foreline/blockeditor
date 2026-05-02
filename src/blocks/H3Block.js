'use strict';

import {HeadingBlock} from "@/blocks/HeadingBlock";

/**
 * H3 block
 */
export class H3Block extends HeadingBlock
{
    constructor(content = '', html = '', nested = false) {
        super(3, content, html, nested);
    }

    static getMarkdownTriggers() {
        return ['### '];
    }

    static getToolbarConfig() {
        return {
            class: 'bke-toolbar-header3',
            label: 'Heading 3',
            group: 'headers'
        };
    }
}
