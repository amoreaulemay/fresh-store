/// <reference path="./global.d.ts" />

// Polyfill for browsers that don't support the native `structuredClone`.
(async () => {
    if ('structuredClone' in window === false) {
        await import('https://deno.land/x/corejs@v3.24.1/index.js');
    }
})();

export interface Observer<T> {
    update(subject: Store<T>): void;
}

export interface Subject<T> {
    readonly state: T;
    attach(observer: Observer<T>): void;
    detach(observer: Observer<T>): void;
    notify(): void;
    set(options: T): void;
    set(options: (prevState: T) => T): void;
}

/**
 * A simple store that follows the Observer pattern.
 */
export class Store<T> implements Subject<T> {
    /**
     * @internal
     * List of all the observers attached to the store.
     */
    #observers: Observer<T>[] = [];

    /**
     * @internal
     * The internal representation of state.
     */
    #state: T;

    /**
     * A deep copy of the internal state, to prevent referenced objects to be directly mutated.
     * 
     * @remarks
     * To mutate the state, use {@link Store.set}.
     */
    public get state(): T { return structuredClone(this.#state) as T; }

    /**
     * Creates a new `Store` (aka {@link Subject}) that can be subscribed to, or observed for a state change.
     */
    constructor(state: T) {
        this.#state = state;
    }

    /**
     * Attaches/subscribes a new {@link Observer} to the store.
     * 
     * @param observer Subscribes a new {@link Observer} to the store.
     */
    public attach(observer: Observer<T>): void {
        const isExist = this.#observers.includes(observer);
        if (isExist) {
            return console.warn('Subject: Observer has been attached already.');
        }

        this.#observers.push(observer);
    }

    /**
     * Detaches/unsubscribes an {@link Observer} from the store.
     * 
     * @param observer The `Observer` to remove.
     */
    public detach(observer: Observer<T>): void {
        const observerIndex = this.#observers.indexOf(observer);
        if (observerIndex === -1) {
            return console.error('Subject: Nonexistent observer.', observer);
        }

        this.#observers.splice(observerIndex, 1);
    }

    /**
     * Notifies all the observers of a change. Will trigger automatically when the state is changed through
     * {@link Store.set}, but it can be forced by calling this method directly.
     */
    public notify(): void {
        for (const observer of this.#observers) {
            observer.update(this);
        }
    }

    /**
     * Method to mutate the internal state. If a value is directly provided, assign the internal state to that value.
     * A function can also be provided to access a dereferenced copy of the previous state.
     * 
     * @param options A value, or function to access the previous state.
     */
    public set(options: T | ((prevState: T) => T)): void {
        if (typeof options === "function") {
            this.#state = structuredClone((options as (prevState: T) => T)(structuredClone(this.state) as T)) as T;
        } else {
            this.#state = structuredClone(options) as T;
        }

        this.notify();
    }
}

/**
 * Convenience type alias for a pointer.
 */
export type Pointer = string;

/**
 * The options to create a store.
 */
export interface StoreOptions<T> {
    /**
     * A key or "pointer" to the store location in `window.stores`.
     * 
     * @remarks
     * If no pointer is provided, it will be automatically generated and the function will return the pointer as a `string`.
     * 
     * @optional
     */
    pointer?: Pointer;

    /**
     * A "free" observer already configured. Will execute the callback when the state change.
     * 
     * @optional
     */
    onChange?: (state: T) => void;

    /**
     * Additional observers that need to be attached to the store.
     * 
     * @optional
     */
    observers?: Observer<T>[];

    /**
     * If set to true, will override the store at the pointer's address if it exists.
     * 
     * @remark
     * Has no effect if the address is unallocated.
     * 
     * @default false
     * 
     * @optional
     */
    override?: boolean;
}

/**
 * Convenience function to create a store. Multiple options can be provided, see {@link StoreOptions}.
 * 
 * Unless the `override` option is set to `true`, this function will not override an existing store, it
 * is therefore safe to use to make sure a store is defined in multiple components.
 * 
 * **If no pointer is provided, a pointer will be assigned and returned.**
 * 
 * ### Example
 * 
 * ```typescript
 * // 1. Creating a store without any options
 * const store1Ptr = useStore(0);
 * console.log(Stores.get<number>(store1Ptr).state); // Output: 0
 * 
 * // 2. Creating a store with options
 * const store2Ptr = crypto.randomUUID();
 * useStore(0, { pointer: store2Ptr, onChange: (state) => console.log(state), });
 * 
 * console.log(Stores.get<number>(store2Ptr).state); // Ouput: 0
 * Stores.get<number>(store2Ptr).set((prevState) => prevState + 1); // Ouput: 1
 * ```
 * 
 * @param state The initial state. If the store already exists, it will not overwrite the state unless the `override` option is set to `true`.
 * @param options See {@link StoreOptions}.
 * @returns The {@link Pointer} to the location of the store.
 */
export function useStore<T>(state: T, options?: StoreOptions<T>): Pointer {
    if (typeof options === "object") {
        // Options are provided

        const pointer = options.pointer ?? crypto.randomUUID();
        const callback = options.onChange ?? (() => null);
        const observers = options.observers ?? [];
        const override = options.override ?? false;

        class StoreObserver implements Observer<T> {
            public update(subject: Store<T>): void {
                callback(subject.state);
            }
        }

        observers.push(new StoreObserver());

        if (override) {
            // If a store exists at address, it will be overrided.

            const store = new Store(state);

            for (const observer of observers) {
                store.attach(observer);
            }

            Stores.addStoreAtPointer(store, pointer, true, false);
        } else {
            // If a store exists at address, it will NOT be overrided, but additional observers will be attached to the store.

            Stores.upsert(state, pointer, ...observers);
        }

        return pointer;
    } else {
        // No options are provided

        return Stores.addStore(new Store(state));
    }
}

// deno-lint-ignore no-explicit-any
export type AnyStore = Store<any>;

interface _StoreStack {
    [key: Pointer]: AnyStore;
}

export class StoreStack {
    static configure(): void {
        if (typeof window.stores === "undefined" || window.stores instanceof StoreStack === false) {
            window.stores = new StoreStack();
        }
    }

    private stores: _StoreStack = {};

    public addStore(newItem: AnyStore): Pointer {
        const ptr = crypto.randomUUID();

        this.stores[ptr] = newItem;
        return ptr;
    }

    public addStoreAtPointer(newItem: AnyStore, pointer: Pointer, override?: boolean, verbose?: boolean): void {
        if (typeof this.stores[pointer] !== "undefined" && !override) {
            if (verbose) {
                return console.warn('Error: Cannot add store at pointer, address is already allocated.');
            } else {
                return;
            }
        }

        this.stores[pointer] = newItem;
    }

    public upsert<T>(defaultValue: T, pointer: Pointer, ...observers: Observer<T>[]): void {
        if (typeof this.stores[pointer] === "undefined") {
            this.stores[pointer] = new Store(defaultValue);
        }

        for (const observer of observers) {
            this.stores[pointer].attach(observer);
        }
    }

    public removeStore(ptr: Pointer): void {
        if (typeof this.stores[ptr] === "undefined") {
            return console.error('Error: The pointer address points to unallocated memory.');
        }

        delete this.stores[ptr];
    }

    // deno-lint-ignore no-explicit-any
    public get<T = any>(ptr: Pointer): Store<T> | undefined {
        if (typeof this.stores[ptr] !== "undefined") {
            return this.stores[ptr] as Store<T>;
        }

        return undefined;
    }
}

export const Stores: StoreStack = (function () {
    StoreStack.configure();
    return window.stores;
})();
