/**
 * Tests for the transaction wrapper
 * Covers EditorStateMachine transaction support, EditorEventEmitter suppression,
 * and Editor.transaction() integration.
 */

import { EditorStateMachine, EditorState } from '../src/utils/EditorStateMachine.js';
import { EditorEventEmitter, EVENTS } from '../src/utils/eventEmitter.js';

describe('EditorStateMachine — transaction support', () => {
    let sm;

    beforeEach(() => {
        sm = new EditorStateMachine();
    });

    describe('initial state', () => {
        test('inTransaction is false initially', () => {
            expect(sm.inTransaction).toBe(false);
        });

        test('_transactionDepth starts at 0', () => {
            expect(sm._transactionDepth).toBe(0);
        });
    });

    describe('startTransaction / finishTransaction', () => {
        test('startTransaction increments depth and makes isBusy true', () => {
            sm.startTransaction();
            expect(sm.inTransaction).toBe(true);
            expect(sm.isBusy()).toBe(true);
            expect(sm._transactionDepth).toBe(1);
        });

        test('finishTransaction decrements depth back to idle', () => {
            sm.startTransaction();
            sm.finishTransaction();
            expect(sm.inTransaction).toBe(false);
            expect(sm.isBusy()).toBe(false);
            expect(sm._transactionDepth).toBe(0);
        });

        test('transactions nest correctly', () => {
            sm.startTransaction();
            sm.startTransaction();
            expect(sm._transactionDepth).toBe(2);
            expect(sm.isBusy()).toBe(true);

            sm.finishTransaction();
            expect(sm._transactionDepth).toBe(1);
            expect(sm.isBusy()).toBe(true);

            sm.finishTransaction();
            expect(sm._transactionDepth).toBe(0);
            expect(sm.isBusy()).toBe(false);
        });

        test('finishTransaction does not go below 0', () => {
            sm.finishTransaction();
            expect(sm._transactionDepth).toBe(0);
        });
    });

    describe('isBusy includes transaction depth', () => {
        test('isBusy is true when only in transaction (state is IDLE)', () => {
            sm.startTransaction();
            expect(sm.state).toBe(EditorState.IDLE);
            expect(sm.isBusy()).toBe(true);
        });

        test('isBusy remains true after internal creating cycle inside transaction', () => {
            sm.startTransaction();
            sm.startCreating();
            sm.finishCreating();
            // State returned to IDLE but transaction keeps isBusy true
            expect(sm.state).toBe(EditorState.IDLE);
            expect(sm.isBusy()).toBe(true);
        });

        test('isBusy remains true after internal converting cycle inside transaction', () => {
            sm.startTransaction();
            sm.startConverting();
            sm.finishConverting();
            expect(sm.state).toBe(EditorState.IDLE);
            expect(sm.isBusy()).toBe(true);
        });
    });

    describe('queue flushing on finishTransaction', () => {
        test('queued operations flush when outermost transaction finishes', () => {
            const fn = jest.fn();
            sm.startTransaction();
            sm.enqueue(fn);
            expect(fn).not.toHaveBeenCalled();

            sm.finishTransaction();
            expect(fn).toHaveBeenCalledTimes(1);
        });

        test('queued operations do not flush on inner transaction finish', () => {
            const fn = jest.fn();
            sm.startTransaction();
            sm.startTransaction();
            sm.enqueue(fn);

            sm.finishTransaction(); // inner
            expect(fn).not.toHaveBeenCalled();

            sm.finishTransaction(); // outer
            expect(fn).toHaveBeenCalledTimes(1);
        });
    });

    describe('reset clears transaction depth', () => {
        test('reset sets depth to 0', () => {
            sm.startTransaction();
            sm.startTransaction();
            sm.reset();
            expect(sm._transactionDepth).toBe(0);
            expect(sm.inTransaction).toBe(false);
            expect(sm.isBusy()).toBe(false);
        });
    });
});

describe('EditorEventEmitter — suppress / resume', () => {
    let emitter;

    beforeEach(() => {
        emitter = new EditorEventEmitter({ debug: false });
    });

    test('isSuppressed is false initially', () => {
        expect(emitter.isSuppressed).toBe(false);
    });

    test('suppress makes isSuppressed true', () => {
        emitter.suppress();
        expect(emitter.isSuppressed).toBe(true);
    });

    test('resume restores isSuppressed to false', () => {
        emitter.suppress();
        emitter.resume();
        expect(emitter.isSuppressed).toBe(false);
    });

    test('suppress/resume nest correctly', () => {
        emitter.suppress();
        emitter.suppress();
        expect(emitter.isSuppressed).toBe(true);

        emitter.resume();
        expect(emitter.isSuppressed).toBe(true);

        emitter.resume();
        expect(emitter.isSuppressed).toBe(false);
    });

    test('resume does not go below 0', () => {
        emitter.resume();
        expect(emitter.isSuppressed).toBe(false);
        expect(emitter._suppressionDepth).toBe(0);
    });

    test('events are NOT delivered while suppressed', () => {
        const callback = jest.fn();
        emitter.subscribe('test.event', callback);

        emitter.suppress();
        emitter.emit('test.event', { value: 1 });
        expect(callback).not.toHaveBeenCalled();
    });

    test('events ARE delivered after resume', () => {
        const callback = jest.fn();
        emitter.subscribe('test.event', callback);

        emitter.suppress();
        emitter.emit('test.event', { value: 1 }); // suppressed
        emitter.resume();
        emitter.emit('test.event', { value: 2 }); // delivered
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback.mock.calls[0][0].data.value).toBe(2);
    });

    test('debounced events are also suppressed', () => {
        jest.useFakeTimers();
        const callback = jest.fn();
        emitter.subscribe('test.event', callback);

        emitter.suppress();
        emitter.emit('test.event', { value: 1 }, { debounce: 100 });
        jest.advanceTimersByTime(200);
        expect(callback).not.toHaveBeenCalled();

        jest.useRealTimers();
    });

    test('throttled events are also suppressed', () => {
        const callback = jest.fn();
        emitter.subscribe('test.event', callback);

        emitter.suppress();
        emitter.emit('test.event', { value: 1 }, { throttle: 100 });
        expect(callback).not.toHaveBeenCalled();
    });
});

describe('Editor.transaction() integration', () => {
    // Since Editor requires full DOM initialization, we test the
    // transaction logic via the state machine and event emitter directly,
    // simulating what Editor.transaction() does.

    let sm;
    let emitter;
    let updateTimeout;

    function simulateTransaction(fn) {
        const isOutermost = sm._transactionDepth === 0;
        if (isOutermost && updateTimeout) {
            clearTimeout(updateTimeout);
            updateTimeout = null;
        }
        sm.startTransaction();
        emitter.suppress();
        try {
            return fn();
        } finally {
            emitter.resume();
            sm.finishTransaction();
            if (sm._transactionDepth === 0) {
                // Simulate update() — emit a final event
                emitter.emit('editor.updated', { final: true });
            }
        }
    }

    beforeEach(() => {
        sm = new EditorStateMachine();
        emitter = new EditorEventEmitter({ debug: false });
        updateTimeout = null;
    });

    test('returns the value from the callback', () => {
        const result = simulateTransaction(() => 42);
        expect(result).toBe(42);
    });

    test('suppresses intermediate events and emits final update', () => {
        const callback = jest.fn();
        emitter.subscribe('editor.updated', callback);

        simulateTransaction(() => {
            // These intermediate emissions should be suppressed
            emitter.emit('editor.updated', { intermediate: true });
            emitter.emit('editor.updated', { intermediate: true });
        });

        // Only the final update event should have been delivered
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback.mock.calls[0][0].data.final).toBe(true);
    });

    test('state machine stays busy during entire transaction', () => {
        simulateTransaction(() => {
            expect(sm.isBusy()).toBe(true);

            // Simulate internal create cycle
            sm.startCreating();
            expect(sm.isBusy()).toBe(true);
            sm.finishCreating();
            expect(sm.isBusy()).toBe(true); // still busy due to transaction
        });

        expect(sm.isBusy()).toBe(false);
    });

    test('nested transactions only emit one final update', () => {
        const callback = jest.fn();
        emitter.subscribe('editor.updated', callback);

        simulateTransaction(() => {
            simulateTransaction(() => {
                emitter.emit('editor.updated', { inner: true });
            });
            // Inner transaction should NOT have triggered update
        });

        // Only outermost transaction triggers final event
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback.mock.calls[0][0].data.final).toBe(true);
    });

    test('error in callback still ends transaction cleanly', () => {
        expect(() => {
            simulateTransaction(() => {
                throw new Error('test error');
            });
        }).toThrow('test error');

        expect(sm.isBusy()).toBe(false);
        expect(sm.inTransaction).toBe(false);
        expect(emitter.isSuppressed).toBe(false);
    });

    test('pending update timeout is cancelled at start of outermost transaction', () => {
        const timeoutFn = jest.fn();
        updateTimeout = setTimeout(timeoutFn, 50);

        jest.useFakeTimers();
        simulateTransaction(() => {
            // updateTimeout should have been cleared
        });
        jest.advanceTimersByTime(100);
        expect(timeoutFn).not.toHaveBeenCalled();
        jest.useRealTimers();
    });
});
