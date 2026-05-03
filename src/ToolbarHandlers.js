'use strict';

import {eventEmitter, EVENTS} from "@/utils/eventEmitter.js";

export const ToolbarHandlers = {
  /**
   * Store event listeners per toolbar container for cleanup.
   * Map<HTMLElement (container), Array<{element, event, handler}>>
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
   * Scoped to toolbar.container so multiple editor instances on the same
   * page do not interfere with each other.
   * @param {Object} toolbar - The Toolbar instance to delegate actions to.
   * @return {void}
   */
  init: (toolbar) => {
    const container = toolbar.container;

    // Clear only this instance's previous listeners before re-binding
    ToolbarHandlers.cleanup(container);

    // Track all listeners registered during this init under the container key
    const listeners = [];
    ToolbarHandlers.eventListeners.set(container, listeners);

    // Helper: bind a click handler scoped to this toolbar container
    const on = (selector, handler) => {
        container.querySelectorAll(selector).forEach(btn => {
            btn.addEventListener('click', handler);
            listeners.push({ element: btn, event: 'click', handler });
        });
    };

    // Place <p> instead of <div>
    document.execCommand('defaultParagraphSeparator', false, 'p');

    /*
    * UNDO | REDO
    */
    on('.bke-toolbar-undo', ToolbarHandlers.createToolbarHandler('undo', () => toolbar.undo()));
    on('.bke-toolbar-redo', ToolbarHandlers.createToolbarHandler('redo', () => toolbar.redo()));

    /*
    * HEADERs | PARAGRAPH
    */
    on('.bke-toolbar-header1',  (e) => { e.preventDefault(); toolbar.h1(); });
    on('.bke-toolbar-header2',  (e) => { e.preventDefault(); toolbar.h2(); });
    on('.bke-toolbar-header3',  (e) => { e.preventDefault(); toolbar.h3(); });
    on('.bke-toolbar-header4',  (e) => { e.preventDefault(); toolbar.h4(); });
    on('.bke-toolbar-header5',  (e) => { e.preventDefault(); toolbar.h5(); });
    on('.bke-toolbar-header6',  (e) => { e.preventDefault(); toolbar.h6(); });
    on('.bke-toolbar-paragraph',(e) => { e.preventDefault(); toolbar.paragraph(); });

    /*
    * BOLD | ITALIC | UNDERLINE | STRIKETHROUGH
    */
    on('.bke-toolbar-bold',          (e) => { e.preventDefault(); toolbar.bold(); });
    on('.bke-toolbar-italic',        (e) => { e.preventDefault(); toolbar.italic(); });
    on('.bke-toolbar-underline',     (e) => { e.preventDefault(); toolbar.underline(); });
    on('.bke-toolbar-strikethrough', (e) => { e.preventDefault(); toolbar.strikethrough(); });

    /*
    * UL | OL | SQ
    */
    on('.bke-toolbar-ul', (e) => { e.preventDefault(); toolbar.ul(); });
    on('.bke-toolbar-ol', (e) => { e.preventDefault(); toolbar.ol(); });
    on('.bke-toolbar-sq', (e) => { e.preventDefault(); toolbar.sq(); });

    /*
    * CODE
    */
    on('.bke-toolbar-code', (e) => { e.preventDefault(); toolbar.code(); });

    /*
    * TABLE
    */
    on('.bke-toolbar-table', (e) => { e.preventDefault(); toolbar.table(); });

    /*
    * TEXT | MARKDOWN | HTML
    */
    on('.bke-toolbar-text',     (e) => { e.preventDefault(); toolbar.text(); });
    on('.bke-toolbar-markdown', (e) => { e.preventDefault(); toolbar.markdown(); });
    on('.bke-toolbar-html',     (e) => { e.preventDefault(); toolbar.html(); });

    /*
    * DEBUG MODE TOGGLE
    */
    on('.bke-toolbar-debug', ToolbarHandlers.createToolbarHandler('debug', () => toolbar.debug()));
  },

  /**
   * Add event listener and track it for cleanup under the given container.
   * @param {Element} element
   * @param {string} event
   * @param {Function} handler
   * @param {HTMLElement} [container] - The toolbar container to track under
   */
  addEventListenerWithTracking: (element, event, handler, container) => {
    element.addEventListener(event, handler);
    if (container) {
      const listeners = ToolbarHandlers.eventListeners.get(container) || [];
      listeners.push({ element, event, handler });
      ToolbarHandlers.eventListeners.set(container, listeners);
    }
  },

  /**
   * Clean up event listeners to prevent memory leaks.
   * @param {HTMLElement} [container] - If provided, only removes listeners for that
   *   toolbar container. If omitted, removes all tracked listeners.
   */
  cleanup: (container) => {
    if (container) {
      const listeners = ToolbarHandlers.eventListeners.get(container);
      if (listeners) {
        listeners.forEach(({ element, event, handler }) => {
          try { element.removeEventListener(event, handler); } catch (error) {
            console.warn('Failed to remove event listener:', error);
          }
        });
        ToolbarHandlers.eventListeners.delete(container);
      }
    } else {
      ToolbarHandlers.eventListeners.forEach((listeners) => {
        listeners.forEach(({ element, event, handler }) => {
          try { element.removeEventListener(event, handler); } catch (error) {
            console.warn('Failed to remove event listener:', error);
          }
        });
      });
      ToolbarHandlers.eventListeners.clear();
    }
  }
};