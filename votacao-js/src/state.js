/**
 * Simple reactive state management.
 * Allows components to subscribe to state changes.
 */
export class ReactiveState {
    constructor(initialState) {
        this.state = initialState;
        this.listeners = [];
    }

    /**
     * Updates the state and notifies all subscribers.
     * @param {Object|Function} update - New state fragment or function that returns new state.
     */
    setState(update) {
        const nextState = typeof update === 'function' ? update(this.state) : update;
        this.state = { ...this.state, ...nextState };
        this.notify();
    }

    /**
     * Subscribes to state changes.
     * @param {Function} listener - Function to be called when state changes.
     */
    subscribe(listener) {
        this.listeners.push(listener);
        // Call immediately with current state
        listener(this.state);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    notify() {
        this.listeners.forEach(l => l(this.state));
    }
}
