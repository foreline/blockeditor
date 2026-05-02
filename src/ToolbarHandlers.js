'use strict';

import {eventEmitter, EVENTS} from "@/utils/eventEmitter.js";

export const ToolbarHandlers = {
  /**
   * Store event listeners for cleanup
   */
  eventListeners: new Map(),

  /**
   * Create a toolbar event handler with automatic event emission
   * @param {string} actionName - Name of the toolbar action
   * @param {Function} actionFunction - Function to execute
   * @returns {Function} Enhanced event handler
   */
  createToolbarHandler: (actionName, actionFunction) => {
    return (e) => {
      e.preventDefault();
      
      // Emit toolbar action event
      eventEmitter.emit(EVENTS.TOOLBAR_ACTION, {
        action: actionName,
        timestamp: Date.now(),
        button: e.target
      }, { source: 'toolbar.action' });
      
      // Execute the action
      actionFunction(e);
    };
  },

  /**
   * Handles the click event for the toolbar button.
   * @param {Object} toolbar - The Toolbar instance to delegate actions to.
   * @return {void}
   */
  init: (toolbar) => {
    // Clear existing event listeners before adding new ones
    ToolbarHandlers.cleanup();
    
    // Place <p> instead of <div>
    document.execCommand('defaultParagraphSeparator', false, 'p');

    /*
    * UNDO | REDO
    */

    document
        .querySelectorAll('.bke-toolbar-undo')
        .forEach(btn => {
            const handler = ToolbarHandlers.createToolbarHandler('undo', () => toolbar.undo());
            btn.addEventListener('click', handler);
            ToolbarHandlers.eventListeners.set(btn, { event: 'click', handler });
        });

    document
        .querySelectorAll('.bke-toolbar-redo')
        .forEach(btn => {
            const handler = ToolbarHandlers.createToolbarHandler('redo', () => toolbar.redo());
            btn.addEventListener('click', handler);
            ToolbarHandlers.eventListeners.set(btn, { event: 'click', handler });
        });

    /*
    * HEADERs | PARAGRAPH
    */

    document
        .querySelectorAll('.bke-toolbar-header1')
        .forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                toolbar.h1();
            });
        });

    document
        .querySelectorAll('.bke-toolbar-header2')
        .forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                toolbar.h2();
            });
        });

    document
        .querySelectorAll('.bke-toolbar-header3')
        .forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                toolbar.h3();
            });
        });

    document
        .querySelectorAll('.bke-toolbar-header4')
        .forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                toolbar.h4();
            });
        });

    document
        .querySelectorAll('.bke-toolbar-header5')
        .forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                toolbar.h5();
            });
        });

    document
        .querySelectorAll('.bke-toolbar-header6')
        .forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                toolbar.h6();
            });
        });

    document
        .querySelectorAll('.bke-toolbar-paragraph')
        .forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                toolbar.paragraph();
            });
        });

    /*
    * BOLD | ITALIC | UNDERLINE | STRIKETHROUGH
    */

    document
        .querySelectorAll('.bke-toolbar-bold')
        .forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                toolbar.bold();
            });
        });

    document
        .querySelectorAll('.bke-toolbar-italic')
        .forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                toolbar.italic();
            });
        });

    document
        .querySelectorAll('.bke-toolbar-underline')
        .forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                toolbar.underline();
            });
        });

    document
        .querySelectorAll('.bke-toolbar-strikethrough')
        .forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                toolbar.strikethrough();
            });
        });

    /*
    * UL | OL |
    */

    document
        .querySelectorAll('.bke-toolbar-ul')
        .forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                toolbar.ul();
            });
        });

    document
        .querySelectorAll('.bke-toolbar-ol')
        .forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                toolbar.ol();
            });
        });

    document
        .querySelectorAll('.bke-toolbar-sq')
        .forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                toolbar.sq();
            });
        });

    /*
    * CODE
    */

    document
        .querySelectorAll('.bke-toolbar-code')
        .forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                toolbar.code();
            });
        });

    /*
    * TABLE
    */

    document
        .querySelectorAll('.bke-toolbar-table')
        .forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                toolbar.table();
            });
        });

    /*
    * TEXT | MARKDOWN | HTML
    */

    document
        .querySelectorAll('.bke-toolbar-text')
        .forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                toolbar.text();
            });
        });

    document
        .querySelectorAll('.bke-toolbar-markdown')
        .forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                toolbar.markdown();
            });
        });

    document
        .querySelectorAll('.bke-toolbar-html')
        .forEach(btn => {
            const handler = (e) => {
                e.preventDefault();
                toolbar.html();
            };
            btn.addEventListener('click', handler);
            ToolbarHandlers.eventListeners.set(btn, { event: 'click', handler });
        });

    /*
    * DEBUG MODE TOGGLE
    */
    document
        .querySelectorAll('.bke-toolbar-debug')
        .forEach(btn => {
            const handler = ToolbarHandlers.createToolbarHandler('debug', () => toolbar.debug());
            btn.addEventListener('click', handler);
            ToolbarHandlers.eventListeners.set(btn, { event: 'click', handler });
        });
  },

  /**
   * Add event listener and track it for cleanup
   * @param {Element} element 
   * @param {string} event 
   * @param {Function} handler 
   */
  addEventListenerWithTracking: (element, event, handler) => {
    element.addEventListener(event, handler);
    ToolbarHandlers.eventListeners.set(element, { event, handler });
  },

  /**
   * Clean up all event listeners to prevent memory leaks
   */
  cleanup: () => {
    ToolbarHandlers.eventListeners.forEach((listenerInfo, element) => {
      try {
        element.removeEventListener(listenerInfo.event, listenerInfo.handler);
      } catch (error) {
        console.warn('Failed to remove event listener:', error);
      }
    });
    ToolbarHandlers.eventListeners.clear();
  }
};