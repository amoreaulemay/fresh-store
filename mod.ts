/// <reference path="./global.d.ts" />

export interface Observer<T> {
    update(subject: Store<T>): void;
}

export interface Subject<T> {
    attach(observer: Observer<T>): void;
    detach(observer: Observer<T>): void;
    notify(): void;
    set(options: T): void;
    set(options: (prevState: T) => T): void;
}

export class Store<T> implements Subject<T> {
    private observers: Observer<T>[] = [];

    constructor(public state: T) { }

    public attach(observer: Observer<T>): void {
        const isExist = this.observers.includes(observer);
        if (isExist) {
            return console.warn('Subject: Observer has been attached already.');
        }

        this.observers.push(observer);
    }

    public detach(observer: Observer<T>): void {
        const observerIndex = this.observers.indexOf(observer);
        if (observerIndex === -1) {
            return console.error('Subject: Nonexistent observer.', observer);
        }

        this.observers.splice(observerIndex, 1);
    }

    public notify(): void {
        for (const observer of this.observers) {
            observer.update(this);
        }
    }

    public set(options: T | ((prevState: T) => T)): void {
        if (typeof options === "function") {
            this.state = (options as (prevState: T) => T)(structuredClone(this.state) as T);
        } else {
            this.state = structuredClone(options) as T;
        }

        this.notify();
    }
}

/**
 * Create a store and insert it into `window.stores` object. Returns the index pointing to its location.
 * 
 * @example
 * ```
 * // Let the store create its own pointer
 * const ptr = useStore("Test", (state) => console.log(`I was changed to ${state}`));
 * 
 * // Changing the value
 * window.stores.get<string>(ptr).set("New Value"); // Will notify observers. Output to console: "I was changed to New Value".
 * 
 * // Creating a store with a given pointer
 * const pointer = crypto.randomUUID();
 * useStore("Test with pointer", (state) => console.log(`New state: ${state}`), pointer);
 * 
 * window.stores.get<string>(pointer).set("New Value 2"); // Will notify observers. Ouput to console: "New state: New Value 2".
 * ```
 * 
 * @param state The initial state value.
 * @param onChange A "free" callback to be executed on state change.
 * @param pointer An optionnal pre-defined pointer. If provided, it will use that pointer.
 * @param observers Additional observers to be attached to the store.
 * @returns A pointer to the store in `window.stores`.
 */
export function useStore<T>(state: T, onChange: (state: T) => void, pointer?: string, ...observers: Observer<T>[]): string {
    const store = new Store(state);

    class StoreObserver implements Observer<T> {
        public update(subject: Store<T>): void {
            onChange(subject.state);
        }
    }

    store.attach(new StoreObserver());

    if (typeof observers !== "undefined") {
        for (const observer of observers) {
            store.attach(observer);
        }
    }

    StoreStack.configure();

    if (typeof pointer === "string") {
        window.stores.addStoreAtPointer(store, pointer);
        return pointer;
    } else {
        return window.stores.addStore(store);
    }

}

// deno-lint-ignore no-explicit-any
export type AnyStore = Store<any>;

interface _StoreStack {
    [key: string]: AnyStore;
}

export class StoreStack {
    static configure(): void {
        if (typeof window.stores === "undefined" || window.stores instanceof StoreStack === false) {
            window.stores = new StoreStack();
        }
    }

    private stores: _StoreStack = {};

    public addStore(newItem: AnyStore): string {
        const ptr = crypto.randomUUID();

        this.stores[ptr] = newItem;
        return ptr;
    }

    public addStoreAtPointer(newItem: AnyStore, pointer: string): void {
        if (typeof this.stores[pointer] !== "undefined") {
            return console.error('Error: Cannot add store at pointer, address is already allocated.');
        }

        this.stores[pointer] = newItem;
    }

    public upsert<T>(defaultValue: T, pointer: string, ...observers: Observer<T>[]): void {
        if (typeof this.stores[pointer] === "undefined") {
            this.stores[pointer] = new Store(defaultValue);
        }

        for (const observer of observers) {
            this.stores[pointer].attach(observer);
        }
    }

    public removeStore(ptr: string): void {
        if (typeof this.stores[ptr] === "undefined") {
            return console.error('Error: The pointer address points to unallocated memory.');
        }

        delete this.stores[ptr];
    }

    // deno-lint-ignore no-explicit-any
    public get<T = any>(ptr: string): Store<T> | undefined {
        if (typeof this.stores[ptr] !== "undefined") {
            return this.stores[ptr] as Store<T>;
        }

        return undefined;
    }
}
