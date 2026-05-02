'use strict';

import {HeadingBlock} from "@/blocks/HeadingBlock";

/**
 * H5 block
 */
export class H5Block extends HeadingBlock
{
    constructor(content = '', html = '', nested = false) {
        super(5, content, html, nested);
    }

    static getMarkdownTriggers() {
        return ['##### '];
    }

    static getToolbarConfig() {
        return {
            class: 'bke-toolbar-header5',
            label: 'Heading 5',
            group: 'headers'
        };
    }
}
