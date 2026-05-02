'use strict';

import {HeadingBlock} from "@/blocks/HeadingBlock";

/**
 * H6 block
 */
export class H6Block extends HeadingBlock
{
    constructor(content = '', html = '', nested = false) {
        super(6, content, html, nested);
    }

    static getMarkdownTriggers() {
        return ['###### '];
    }

    static getToolbarConfig() {
        return {
            class: 'bke-toolbar-header6',
            label: 'Heading 6',
            group: 'headers'
        };
    }
}
