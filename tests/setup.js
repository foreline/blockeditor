/**
 * Jest setup file for DOM mocking and global test configuration
 */

// Mock DOM elements with proper classList support
const mockClassList = {
    add: jest.fn(),
    remove: jest.fn(),
    toggle: jest.fn(),
    contains: jest.fn().mockReturnValue(false),
    replace: jest.fn(),
    value: '',
    toString: () => '',
    length: 0,
    item: jest.fn(),
    forEach: jest.fn()
};

const mockStyle = {
    setProperty: jest.fn(),
    removeProperty: jest.fn(),
    getPropertyValue: jest.fn().mockReturnValue(''),
    display: '',
    visibility: '',
    opacity: '',
    transform: '',
    background: '',
    color: '',
    fontSize: '',
    fontWeight: '',
    textAlign: '',
    margin: '',
    padding: '',
    border: '',
    borderRadius: '',
    width: '',
    height: '',
    top: '',
    left: '',
    right: '',
    bottom: '',
    position: '',
    zIndex: ''
};

// Simple selector matching for mock elements (supports tag, .class, tag.class)
const _mockMatchesSelector = (el, selector) => {
    if (!el || !selector) return false;
    selector = selector.trim();
    // Class selector: .bke-block, .bke-block--code
    if (selector.startsWith('.')) {
        const cls = selector.substring(1);
        return (el.className || '').split(/\s+/).includes(cls);
    }
    // Tag selector: pre, code, h1, div
    return el.tagName && el.tagName.toLowerCase() === selector.toLowerCase();
};

const createMockElement = (tagName = 'div') => ({
    tagName: tagName.toUpperCase(),
    classList: { ...mockClassList },
    style: { ...mockStyle },
    innerHTML: '',
    textContent: '',
    innerText: '',
    outerHTML: `<${tagName}></${tagName}>`,
    parentNode: null,
    children: [],
    childNodes: [],
    firstChild: null,
    lastChild: null,
    nextSibling: null,
    previousSibling: null,
    nodeType: 1,
    nodeName: tagName.toUpperCase(),
    nodeValue: null,
    attributes: {},
    dataset: {},
    id: '',
    className: '',
    
    // Methods
    appendChild: jest.fn(function(child) {
        this.children.push(child);
        child.parentNode = this;
        return child;
    }),
    removeChild: jest.fn(function(child) {
        const index = this.children.indexOf(child);
        if (index > -1) {
            this.children.splice(index, 1);
            child.parentNode = null;
        }
        return child;
    }),
    insertBefore: jest.fn(),
    replaceChild: jest.fn(),
    cloneNode: jest.fn(),
    contains: jest.fn().mockReturnValue(false),
    querySelector: jest.fn(function(selector) {
        // Simple recursive search through mock children
        const search = (el) => {
            for (const child of (el.children || [])) {
                if (_mockMatchesSelector(child, selector)) return child;
                const found = search(child);
                if (found) return found;
            }
            return null;
        };
        return search(this);
    }),
    querySelectorAll: jest.fn(function(selector) {
        const results = [];
        const search = (el) => {
            for (const child of (el.children || [])) {
                if (_mockMatchesSelector(child, selector)) results.push(child);
                search(child);
            }
        };
        search(this);
        return results;
    }),
    getElementsByTagName: jest.fn().mockReturnValue([]),
    getElementsByClassName: jest.fn().mockReturnValue([]),
    getElementById: jest.fn(),
    getAttribute: jest.fn(function(name) {
        return this.attributes && this.attributes[name] !== undefined ? this.attributes[name] : null;
    }),
    setAttribute: jest.fn(function(name, value) {
        this.attributes[name] = value;
        if (name === 'class') this.className = value;
        if (name === 'id') this.id = value;
    }),
    removeAttribute: jest.fn(function(name) {
        if (this.attributes) delete this.attributes[name];
    }),
    hasAttribute: jest.fn(function(name) {
        return this.attributes && this.attributes[name] !== undefined;
    }),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
    focus: jest.fn(),
    blur: jest.fn(),
    click: jest.fn(),
    scrollIntoView: jest.fn(),
    // Minimal selector engine for closest() support in tests
    matches: jest.fn(function(selector){
        if (!selector) return false;
        // Support simple selectors used in tests: tag, .class, tag.class
        selector = selector.trim();
        const hasClass = selector.includes('.')
        const [selTag, selClass] = hasClass ? selector.split('.') : [selector, null];
        const tagOk = selTag ? this.tagName.toLowerCase() === selTag.toLowerCase() : true;
        const classOk = selClass ? (this.className || '').split(/\s+/).includes(selClass) : true;
        return tagOk && classOk;
    }),
    closest: jest.fn(function(selector){
        let el = this;
        while (el) {
            if (typeof el.matches === 'function' && el.matches(selector)) return el;
            el = el.parentNode;
        }
        return null;
    }),
    // after(node): insert after this element
    after: jest.fn(function(newNode){
        if (!this.parentNode) return;
        const parent = this.parentNode;
        const idx = parent.children.indexOf(this);
        if (idx === -1) return;
        // insert after current index
        parent.children.splice(idx + 1, 0, newNode);
        newNode.parentNode = parent;
        // keep first/lastChild hints best-effort
        parent.firstChild = parent.children[0] || null;
        parent.lastChild = parent.children[parent.children.length - 1] || null;
    }),
    
    // Properties for specific element types
    get checked() { return this._checked || false; },
    set checked(value) { this._checked = value; },
    get value() { return this._value || ''; },
    set value(val) { this._value = val; },
    get type() { return this._type || ''; },
    set type(val) { this._type = val; },
    get href() { return this._href || ''; },
    set href(val) { this._href = val; },
    get src() { return this._src || ''; },
    set src(val) { this._src = val; },
    get alt() { return this._alt || ''; },
    set alt(val) { this._alt = val; }
});

// Mock document.createElement
// Save originals so integration tests can restore real JSDOM functions
global._originalCreateElement = global.document.createElement.bind(global.document);
global._originalGetElementById = global.document.getElementById.bind(global.document);
global._originalQuerySelector = global.document.querySelector.bind(global.document);
global._originalQuerySelectorAll = global.document.querySelectorAll.bind(global.document);
global._originalBody = global.document.body;
global._originalCreateTextNode = global.document.createTextNode.bind(global.document);

global.document.createElement = jest.fn((tagName) => createMockElement(tagName));

// Mock document methods
// Provide a basic execCommand mock used by Toolbar/ToolbarHandlers
global.document.execCommand = jest.fn();
global.document.querySelector = jest.fn();
global.document.querySelectorAll = jest.fn().mockReturnValue([]);
global.document.getElementById = jest.fn().mockReturnValue(createMockElement());
global.document.getElementsByTagName = jest.fn().mockReturnValue([]);
global.document.getElementsByClassName = jest.fn().mockReturnValue([]);
global.document.createTextNode = jest.fn((text) => ({
    nodeType: 3,
    nodeName: '#text',
    nodeValue: text,
    textContent: text,
    parentNode: null
}));

// Mock document properties
// configurable: true allows integration tests to delete the own property
// and restore jsdom's prototype accessor (fixes _version crash on Node 20)
Object.defineProperty(global.document, 'body', {
    value: createMockElement('body'),
    writable: true,
    configurable: true
});

Object.defineProperty(global.document, 'documentElement', {
    value: createMockElement('html'),
    writable: true,
    configurable: true
});

// Mock window.getSelection
global.window.getSelection = jest.fn(() => ({
    getRangeAt: jest.fn().mockReturnValue({
        startOffset: 0,
        endOffset: 0,
        collapsed: true,
        startContainer: createMockElement(),
        endContainer: createMockElement(),
        cloneRange: jest.fn(),
        setStart: jest.fn(),
        setEnd: jest.fn(),
        collapse: jest.fn()
    }),
    removeAllRanges: jest.fn(),
    addRange: jest.fn(),
    rangeCount: 1,
    anchorNode: null,
    focusNode: null,
    anchorOffset: 0,
    focusOffset: 0,
    isCollapsed: true,
    toString: jest.fn().mockReturnValue('')
}));

// Mock Range constructor
global.Range = jest.fn(() => ({
    startOffset: 0,
    endOffset: 0,
    collapsed: true,
    startContainer: createMockElement(),
    endContainer: createMockElement(),
    cloneRange: jest.fn(),
    setStart: jest.fn(),
    setEnd: jest.fn(),
    collapse: jest.fn(),
    selectNodeContents: jest.fn(),
    deleteContents: jest.fn(),
    insertNode: jest.fn()
}));

// Mock Prism global for syntax highlighting
global.Prism = {
    highlight: jest.fn((code, grammar, language) => {
        // Return the code wrapped in a simple span to simulate highlighting
        return `<span class="token">${code}</span>`;
    }),
    languages: {
        javascript: {},
        js: {},
        typescript: {},
        ts: {},
        python: {},
        java: {},
        csharp: {},
        cpp: {},
        c: {},
        php: {},
        ruby: {},
        go: {},
        rust: {},
        swift: {},
        kotlin: {},
        scala: {},
        html: {},
        markup: {},
        xml: {},
        css: {},
        scss: {},
        sass: {},
        less: {},
        json: {},
        yaml: {},
        sql: {},
        bash: {},
        shell: {},
        powershell: {},
        markdown: {},
        latex: {},
        r: {},
        matlab: {},
        perl: {},
        lua: {},
        haskell: {},
        clojure: {},
        erlang: {},
        elixir: {},
        dart: {},
        vue: {},
        jsx: {},
        tsx: {}
    },
    util: {
        encode: jest.fn((code) => code),
        type: jest.fn()
    },
    Token: jest.fn()
};

// Enhanced BlockFactory mock for comprehensive testing
jest.mock('../src/blocks/BlockFactory', () => ({
    BlockFactory: {
        getAllBlockClasses: jest.fn(() => [
            { matches: jest.fn(() => false), name: 'ParagraphBlock' },
            { matches: jest.fn(() => false), name: 'HeadingBlock' },
            { matches: jest.fn(() => false), name: 'H1Block' },
            { matches: jest.fn(() => false), name: 'H2Block' },
            { matches: jest.fn(() => false), name: 'H3Block' },
            { matches: jest.fn(() => false), name: 'H4Block' },
            { matches: jest.fn(() => false), name: 'H5Block' },
            { matches: jest.fn(() => false), name: 'H6Block' },
            { matches: jest.fn(() => false), name: 'ListBlock' },
            { matches: jest.fn(() => false), name: 'UnorderedListBlock' },
            { matches: jest.fn(() => false), name: 'OrderedListBlock' },
            { matches: jest.fn(() => false), name: 'TaskListBlock' },
            { matches: jest.fn(() => false), name: 'CodeBlock' },
            { matches: jest.fn(() => false), name: 'QuoteBlock' },
            { matches: jest.fn(() => false), name: 'TableBlock' },
            { matches: jest.fn(() => false), name: 'ImageBlock' },
            { matches: jest.fn(() => false), name: 'DelimiterBlock' }
        ]),
        createBlock: jest.fn((type) => ({
            type,
            element: createMockElement(),
            applyTransformation: jest.fn(),
            handleKeyPress: jest.fn(),
            handleBackspaceKey: jest.fn(),
            renderToElement: jest.fn(() => createMockElement()),
            getContent: jest.fn(() => ''),
            setContent: jest.fn(),
            focus: jest.fn(),
            remove: jest.fn(),
            updateContent: jest.fn()
        })),
        getBlockClass: jest.fn((type) => {
            const mockBlockClass = function() {
                return {
                    type,
                    element: createMockElement(),
                    applyTransformation: jest.fn(),
                    handleKeyPress: jest.fn(),
                    handleBackspaceKey: jest.fn(),
                    renderToElement: jest.fn(() => createMockElement()),
                    getContent: jest.fn(() => ''),
                    setContent: jest.fn(),
                    focus: jest.fn(),
                    remove: jest.fn(),
                    updateContent: jest.fn()
                };
            };
            mockBlockClass.matches = jest.fn(() => false);
            mockBlockClass.getToolbarButtons = jest.fn(() => []);
            mockBlockClass.getDisabledButtons = jest.fn(() => []);
            return mockBlockClass;
        }),
        registerBlock: jest.fn(),
        getAvailableBlocks: jest.fn(() => []),
        isRegistered: jest.fn(() => true)
    }
}));

// Mock event emitter
global.eventEmitter = {
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    once: jest.fn(),
    removeAllListeners: jest.fn()
};

// Mock console methods for cleaner test output
const originalConsole = global.console;
global.console = {
    ...originalConsole,
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
};

// Mock requestAnimationFrame and cancelAnimationFrame
global.requestAnimationFrame = jest.fn((cb) => setTimeout(cb, 0));
global.cancelAnimationFrame = jest.fn((id) => clearTimeout(id));

// Mock performance API
global.performance = {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn(() => []),
    getEntriesByType: jest.fn(() => []),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn()
};

// Mock localStorage and sessionStorage
const createMockStorage = () => {
    let store = {};
    return {
        getItem: jest.fn((key) => store[key] || null),
        setItem: jest.fn((key, value) => { store[key] = value.toString(); }),
        removeItem: jest.fn((key) => { delete store[key]; }),
        clear: jest.fn(() => { store = {}; }),
        key: jest.fn((index) => Object.keys(store)[index] || null),
        get length() { return Object.keys(store).length; }
    };
};

global.localStorage = createMockStorage();
global.sessionStorage = createMockStorage();

// Mock URL and URLSearchParams
global.URL = class MockURL {
    constructor(url, base) {
        this.href = url;
        this.origin = base || 'http://localhost';
        this.protocol = 'http:';
        this.host = 'localhost';
        this.hostname = 'localhost';
        this.port = '';
        this.pathname = '/';
        this.search = '';
        this.hash = '';
    }
    
    toString() {
        return this.href;
    }
};

global.URLSearchParams = class MockURLSearchParams {
    constructor(init) {
        this.params = new Map();
        if (init) {
            if (typeof init === 'string') {
                // Parse query string
                init.replace(/^\?/, '').split('&').forEach(pair => {
                    const [key, value] = pair.split('=');
                    if (key) this.params.set(decodeURIComponent(key), decodeURIComponent(value || ''));
                });
            }
        }
    }
    
    get(name) { return this.params.get(name); }
    set(name, value) { this.params.set(name, value); }
    has(name) { return this.params.has(name); }
    delete(name) { this.params.delete(name); }
    toString() {
        const pairs = [];
        for (const [key, value] of this.params) {
            pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
        }
        return pairs.join('&');
    }
};
// Export utilities for tests
global.createMockElement = createMockElement;
global.mockClassList = mockClassList;
global.mockStyle = mockStyle;
