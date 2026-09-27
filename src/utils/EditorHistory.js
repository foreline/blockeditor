'use strict';

/** History for DOM-based editor operations that native execCommand cannot undo. */
export class EditorHistory {
    constructor(read, restore, limit = 100) {
        this.read = read;
        this.restore = restore;
        this.limit = limit;
        this.states = [read()];
        this.index = 0;
        this.restoring = false;
    }

    record() {
        if (this.restoring) return;
        const state = this.read();
        if (state === this.states[this.index]) return;
        this.states.splice(this.index + 1);
        this.states.push(state);
        if (this.states.length > this.limit) this.states.shift();
        this.index = this.states.length - 1;
    }

    move(direction) {
        this.record();
        const next = this.index + direction;
        if (next < 0 || next >= this.states.length) return false;
        this.restoring = true;
        try {
            this.restore(this.states[next]);
            this.index = next;
            // Rendering may normalize equivalent HTML; retain that canonical form.
            this.states[next] = this.read();
        } finally {
            this.restoring = false;
        }
        return true;
    }
}
