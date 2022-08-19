/// <reference path="./global.d.ts" />

// Mark: Polyfill
// Polyfill for browsers that don't support the native `structuredClone`.
(async () => {
    if ('structuredClone' in window === false) {
        await import('https://deno.land/x/corejs@v3.24.1/index.js');
    }
})();

// Mark: Definition Interfaces
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

// Mark: Custom Types
/**
 * Convenience type alias for a pointer.
 */
export type Pointer = string;

/**
 * Convenience type for `Store` of any type.
 */
// deno-lint-ignore no-explicit-any
export type AnyStore = Store<any>;

// Mark: Custom Errors
/**
 * Error that is triggered when a duplicated observer is being attached to a store.
 * 
 * @final
 */
export class DuplicateObserverError extends Error {
    constructor() {
        super("This observer is already attached to the store.");
    }
}

/**
 * Error that is triggered when a non-existing/non-attached observer is being detached from a store.
 * 
 * @final
 */
export class UnknownObserverError extends Error {
    constructor() {
        super("Attempted removal of unattached observer.");
    }
}

/**
 * Error that is triggered when attempting to insert a store at an address that was already allocated,
 * without explicit override.
 * 
 * @final
 */
export class MemoryAllocationError extends Error {
    constructor() {
        super("Attempted to insert store at already allocated memory address without explicit override.");
    }
}

/**
 * Error that is triggered when attempting to access a memory address that is unallocated.
 * 
 * @final
 */
export class NullPointerError extends Error {
    constructor() {
        super("Attempted to access unallocated memory address.");
    }
}

// Mark: Store
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
     * @throws {DuplicateObserverError} If the observer has already been attached.
     */
    public attach(observer: Observer<T>): void {
        const isExist = this.#observers.includes(observer);
        if (isExist) {
            throw new DuplicateObserverError();
        }

        this.#observers.push(observer);
    }

    /**
     * Detaches/unsubscribes an {@link Observer} from the store.
     * 
     * @param observer The `Observer` to remove.
     * @throws {UnknownObserverError} If the observer was non-existent in the store.
     */
    public detach(observer: Observer<T>): void {
        const observerIndex = this.#observers.indexOf(observer);
        if (observerIndex === -1) {
            throw new UnknownObserverError();
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

// Mark: useStore Options

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
     * *Has no effect if the address is unallocated.*
     * 
     * @default undefined
     * @optional
     */
    override?: boolean;

    /**
     * See {@link StoreOptionsErrorHandling}
     */
    errorHandling?: StoreOptionsErrorHandling;
}

/**
 * Defines how {@link useStore} should handle errors.
 */
export interface StoreOptionsErrorHandling {
    /**
     * Set to `true` if error messages should be outputed to the console.
     * 
     * `verbose` is set to `false` by default.
     */
    verbose?: boolean;

    /**
     * By default {@link useStore} will silently ignore errors to allow the program to
     * continue its execution. If `stopOnError` is set to `true`, the function will stop
     * if an error is thrown and will rethrow it.
     */
    stopOnError?: boolean;
}

// Mark: useStore
/**
 * Convenience function to create a store. Multiple options can be provided, see {@link StoreOptions}.
 * 
 * Unless the `override` option is set to `true`, this function will not override an existing store, it
 * is therefore safe to use to make sure a store is defined in multiple components.
 * 
 * **If no pointer is provided, a pointer will be assigned and returned.**
 * 
 * ## Example
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
 * @throws {DuplicateObserverError} If provided observer(s) is/are already attached to the store or duplicates.
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
                try {
                    store.attach(observer);
                } catch (error) {
                    if (options.errorHandling?.verbose === true) {
                        console.error(error);
                    }

                    if (options.errorHandling?.stopOnError === true) {
                        throw error;
                    }
                }
            }

            Stores.addStoreAtPointer(store, pointer, { override: true });
        } else {
            // If a store exists at address, it will NOT be overrided, but additional observers will be attached to the store.

            try {
                Stores.upsert(state, pointer, ...observers);
            } catch (error) {
                if (options.errorHandling?.verbose === true) {
                    console.error(error);
                }

                if (options.errorHandling?.stopOnError === true) {
                    throw error;
                }
            }
        }

        return pointer;
    } else {
        // No options are provided

        return Stores.addStore(new Store(state));
    }
}

// Mark: StoreStack
/**
 * @internal
 * Structure for the `Store` memory stack.
 */
interface _StoreStack {
    [key: Pointer]: AnyStore;
}

/**
 * A multi {@link Store} container.
 */
export class StoreStack {
    /**
     * Checks if the `StoreStack` is instantiated on `window.stores` and creates it if it's not.
     */
    static configure(): void {
        if (typeof window.stores === "undefined" || window.stores instanceof StoreStack === false) {
            window.stores = new StoreStack();
        }
    }

    /**
     * @internal
     * Object containing all the stores.
     */
    #stores: _StoreStack = {};

    /**
     * Adds a store to the memory stack and assigns it a pointer.
     * 
     * @param newItem The {@link Store} to be added to the stack.
     * @returns The {@link Pointer} to the allocated memory for the store.
     */
    public addStore(newItem: AnyStore): Pointer {
        const ptr = crypto.randomUUID();

        this.#stores[ptr] = newItem;
        return ptr;
    }

    /**
     * Adds a store to the specified {@link Pointer}. If a store already exists at the address, an option can be passed to override it.
     * If `override` is set to `false`, but the `verbose` option is set to true, and the memory is already allocated, the store will **NOT**
     * be overrided, and an error message will output to the console.
     * 
     * @param newItem The {@link Store} to be added to the stack.
     * @param pointer The {@link Pointer} to the memory address where the store should be inserted.
     * @param options Defines if a store should be overrided if it exists at the `Pointer` and if a verbose error should be returned if override is set to false.
     * 
     * @throws {MemoryAllocationError} If the address is already allocated and `override` isn't set to `true`.
     */
    public addStoreAtPointer(newItem: AnyStore, pointer: Pointer, options?: { override?: boolean, verbose?: boolean }): void {
        if (typeof this.#stores[pointer] !== "undefined" && !options?.override) {
            if (options?.verbose) {
                console.error('Error: Cannot add store at pointer, address is already allocated.');
            }

            throw new MemoryAllocationError();
        }

        this.#stores[pointer] = newItem;
    }

    /**
     * This method makes sure a store if instantiated at the {@link Pointer}'s address.
     * If no store is instantiated, it will create one holding the `defaultValue` provided.
     * Otherwise, it will only attach {@link Observer Observers} if they are provided.
     * 
     * @throws {DuplicateObserverError} If observer is duplicate.
     * 
     * @param defaultValue A default state value to insert if a new store is created.
     * @param pointer The {@link Pointer} to the memory address.
     * @param observers {@link Observer Observers} to attach to the store.
     */
    public upsert<T>(defaultValue: T, pointer: Pointer, ...observers: Observer<T>[]): void {
        if (typeof this.#stores[pointer] === "undefined") {
            this.#stores[pointer] = new Store(defaultValue);
        }

        for (const observer of observers) {
            try {
                this.#stores[pointer].attach(observer);
            } catch (error) {
                throw error;
            }
        }
    }

    /**
     * Removes a store from the memory stack. If the {@link Pointer}'s address is unallocated,
     * it will output an error message to the `console` if `verbose` option is set to true.
     * 
     * @param ptr The {@link Pointer}'s address of the store.
     * @param options If the removal fails, should the function verbose it to the console? Defaults to false.
     * 
     * @throws {NullPointerError} If attempting to delete a store at unallocated memory address.
     */
    public removeStore(ptr: Pointer, options?: { verbose?: boolean }): void {
        if (typeof this.#stores[ptr] === "undefined") {
            if (options?.verbose) {
                console.error('Error: The pointer address points to unallocated memory.');
            }

            throw new NullPointerError();
        }

        delete this.#stores[ptr];
    }

    /**
     * Returns a reference to the store at the address if it exists, otherwise undefined. A type can be 
     * passed in order to make the return typed.
     * 
     * ## Example
     * ```typescript
     * const ptr = useStore(0);
     * console.log(Stores.get<number>(ptr).state); // Output: 0
     * ```
     * 
     * @param ptr The {@link Pointer} to the store.
     * @returns The store if it exists
     */
    // deno-lint-ignore no-explicit-any
    public get<T = any>(ptr: Pointer): Store<T> | undefined {
        if (typeof this.#stores[ptr] !== "undefined") {
            return this.#stores[ptr] as Store<T>;
        }

        return undefined;
    }
}

// Mark: Stores
/**
 * Convenience constant, provide access to the global `StoreStack` and creates it if it doesn't exist.
 */
export const Stores: StoreStack = (function () {
    StoreStack.configure();
    return window.stores;
})();
