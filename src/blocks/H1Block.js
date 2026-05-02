'use strict';

import {HeadingBlock} from "@/blocks/HeadingBlock";

/**
 * H1 block
 */
export class H1Block extends HeadingBlock
{
    constructor(content = '', html = '', nested = false) {
        super(1, content, html, nested);
    }

    static getMarkdownTriggers() {
        return ['# '];
    }

    static getToolbarConfig() {
        return {
            class: 'bke-toolbar-header1',
            label: 'Heading 1',
            group: 'headers'
        };
    }
}
