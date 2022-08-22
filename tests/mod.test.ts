import { assertEquals, assertExists, assertInstanceOf, assertNotEquals, assertThrows } from "https://deno.land/std@0.151.0/testing/asserts.ts";
import * as mod from "../mod.ts";

// Mark: Test Custom Errors
Deno.test("Testing DuplicateObserverError", () => {
    const error = new mod.DuplicateObserverError() as unknown;

    assertInstanceOf(error, mod.DuplicateObserverError, "Error should be instance of `DuplicateObserverError`.");
    assertEquals(error.message, "This observer is already attached to the store.", "The message does not match expected result");
});

Deno.test("Testing UnknownObserverError", () => {
    const error = new mod.UnknownObserverError() as unknown;

    assertInstanceOf(error, mod.UnknownObserverError, "Error should be instance of `UnknownObserverError`.");
    assertEquals(error.message, "Attempted removal of unattached observer.", "The message does not match expected result");
});

Deno.test("Testing MemoryAllocationError", () => {
    const error = new mod.MemoryAllocationError() as unknown;

    assertInstanceOf(error, mod.MemoryAllocationError, "Error should be instance of `MemoryAllocationError`.");
    assertEquals(error.message, "Attempted to insert store at already allocated memory address without explicit override.", "The message does not match expected result");
});

Deno.test("Testing NullPointerError", () => {
    const error = new mod.NullPointerError() as unknown;

    assertInstanceOf(error, mod.NullPointerError, "Error should be instance of `NullPointerError`.");
    assertEquals(error.message, "Attempted to access unallocated memory address.", "The message does not match expected result");
});

// Mark: Testing setup
Deno.test("The StoreStack should be able to be instantiated", () => {
    const Stores = new mod.StoreStack() as unknown;

    assertInstanceOf(Stores, mod.StoreStack, "Stores should be instance of StoreStack");
});

Deno.test("window.stores should be of instance StoreStack when importing mod.ts", () => {
    assertInstanceOf(window.stores as unknown, mod.StoreStack, "window.stores was expected to be instantiated");
});

// Mark: Testing creating a new store
Deno.test("A new Store can be created", () => {
    const state = "Test";
    const store = new mod.Store(state);

    assertInstanceOf(store, mod.Store, "store should be an instance of Store");
    assertEquals(store.state, state, `store.state should be equal to "${state}"`);
});

Deno.test("A store can generate a pointer", () => {
    const pointer = mod.Store.newPointer();

    assertEquals(typeof pointer, "string", "pointer should be a string");
});

Deno.test("A new observer can be created", () => {
    class ConcreteObserver implements mod.Observer<void> {
        public update(_subject: mod.Store<void>): void {
            return;
        }
    }

    const observer = new ConcreteObserver();

    assertInstanceOf(observer, ConcreteObserver, "observer should be instance of ConcreteObserver");
});

Deno.test("A store can attach and trigger an observer", () => {
    let output = "";
    const expectedResult = "Test";

    class ConcreteObserver implements mod.Observer<string> {
        public update(subject: mod.Store<string>): void {
            output = subject.state;
        }
    }

    const store = new mod.Store(output);
    store.attach(new ConcreteObserver());

    assertEquals(store.state, output, "The ouput should equal the state");
    assertNotEquals(output, expectedResult, "output and expectedResult should not match initially");

    store.set(expectedResult);

    assertEquals(store.state, expectedResult, "The state should equal the expectedResult");
    assertEquals(output, expectedResult, "output should match expectedResult");
});

Deno.test("A store can detach an observer", () => {
    let output = "";
    const expectedResult1 = "Test";
    const expectedResult2 = "Test 2";

    class ConcreteObserver implements mod.Observer<string> {
        public update(subject: mod.Store<string>): void {
            output = subject.state;
        }
    }

    const observer = new ConcreteObserver();
    const store = new mod.Store(output);
    store.attach(observer);

    assertEquals(store.state, output, "The ouput should equal the state");
    assertNotEquals(output, expectedResult1, "output and expectedResult1 should not match initially");
    assertNotEquals(output, expectedResult2, "output and expectedResult2 should not match initially");

    store.set(expectedResult1);

    assertEquals(store.state, expectedResult1, "State should match " + expectedResult1);
    assertEquals(output, expectedResult1, "output should match " + expectedResult1);

    store.detach(observer);
    store.set(expectedResult2);

    assertEquals(store.state, expectedResult2, "Store state should match " + expectedResult2);
    assertNotEquals(output, expectedResult2, "output should not match " + expectedResult2);
});

Deno.test("set can reuse a previous state to modify it", () => {
    const ouput = 0;
    const store = new mod.Store(ouput);

    assertEquals(store.state, ouput, `The state should equal ${ouput}`);

    store.set((prevState) => prevState + 1);

    assertEquals(store.state, ouput + 1, "The state should increment by 1");
});

Deno.test("An observer can be attached only once", () => {
    class ConcreteObserver implements mod.Observer<number> {
        public update(_subject: mod.Store<number>): void {
            return;
        }
    }

    const store = new mod.Store(0);
    const observer = new ConcreteObserver();

    store.attach(observer);

    assertThrows(() => store.attach(observer), mod.DuplicateObserverError, "This observer is already attached to the store.", "Should throw on reattaching observer.");
});

Deno.test("An unattached observer cannot be removed", () => {
    class ConcreteObserver implements mod.Observer<number> {
        public update(_subject: mod.Store<number>): void {
            return;
        }
    }

    const store = new mod.Store(0);
    const observer = new ConcreteObserver();

    assertThrows(() => store.detach(observer), mod.UnknownObserverError, "Attempted removal of unattached observer.", "Should throw on removal of unattached observer.")
});

// Mark: StoreStack tests
Deno.test("An instance of StoreStack can be instantiated", () => {
    const stack = new mod.StoreStack() as unknown;

    assertInstanceOf(stack, mod.StoreStack);
});

Deno.test("A store can be added to a stack without providing a pointer, accessed with the returned pointer and can be removed", () => {
    const stack = new mod.StoreStack();

    const store = new mod.Store(0);
    const ptr = stack.addStore(store);

    const store2 = new mod.Store(1);

    assertExists(ptr, "ptr should not be undefined.");
    assertExists(stack.get<number>(ptr), "The pointer should be allocated");
    assertEquals(stack.get<number>(ptr)!.state, store.state, "The states should match");

    // Cannot be added twice at address without override
    assertThrows(() => stack.addStoreAtPointer(store, ptr, { verbose: true }), mod.MemoryAllocationError, "Attempted to insert store at already allocated memory address without explicit override.", "Should not be able to add at address without override.");

    // Can be overriden
    stack.addStoreAtPointer(store2, ptr, { override: true });

    assertExists(stack.get<number>(ptr), "The pointer should be allocated");
    assertEquals(stack.get<number>(ptr)!.state, store2.state, "The states should match");

    stack.removeStore(ptr);

    assertEquals(typeof stack.get(ptr), "undefined", "The pointer should be unallocated");

    // But cannot be removed twice
    assertThrows(() => stack.removeStore(ptr, { verbose: true }), mod.NullPointerError, "Attempted to access unallocated memory address.", "Should not be able to delete the store twice.");
});

Deno.test("upsert test", () => {
    const stack = new mod.StoreStack();

    const pointer1 = crypto.randomUUID();

    const defaultValue1 = 0;
    const defaultValue2 = 1;

    class ConcreteObserver implements mod.Observer<number> {
        public update(subject: mod.Store<number>): void {
            observerOuput = subject.state;
        }
    }

    const observer = new ConcreteObserver();
    let observerOuput = defaultValue1;

    // Pre assertions
    assertEquals(typeof stack.get(pointer1), "undefined", "Pointer should not already be allocated");

    // Creating a store
    stack.upsert(defaultValue1, pointer1);

    assertExists(stack.get(pointer1), "Store should now exist");
    assertEquals(stack.get(pointer1)!.state, defaultValue1, "State should equal " + defaultValue1);

    stack.upsert(defaultValue2, pointer1);

    assertNotEquals(stack.get(pointer1)!.state, defaultValue2, "Because the store already exists, it should not override its value");

    // Attaching an observer
    stack.upsert(defaultValue1, pointer1, observer);
    stack.get<number>(pointer1)!.set(defaultValue2);

    assertEquals(observerOuput, defaultValue2, "observerOutput and defaultValue2 should match");

    // Throwing on reattaching observer
    assertThrows(() => stack.upsert(defaultValue1, pointer1, observer), mod.DuplicateObserverError, "This observer is already attached to the store.", "Should trigger a duplicate observer error");
});

// Mark: useStore tests
Deno.test("useStore without options", () => {
    const stateValue = "Test";
    const pointer = mod.useStore(stateValue);

    assertExists(mod.Stores.get(pointer), "Store should exist at returned address.");
    assertEquals(mod.Stores.get<string>(pointer)!.state, stateValue, "The store should contain the initial provided value");
});

Deno.test("useStore with callback", () => {
    const startValue = 0;
    const finalValue = 1;

    let observerOutput = startValue;
    const observerCb = (state: number) => observerOutput = state;

    const pointer = mod.useStore(startValue, { onChange: observerCb });

    mod.Stores.get<number>(pointer)!.set(finalValue);

    assertEquals(observerOutput, finalValue, "observerOutput should match finalValue");
});

Deno.test("useStore with pointer", () => {
    const pointer = crypto.randomUUID();
    const value = 0;

    assertEquals(mod.useStore(value, { pointer: pointer }), pointer, "Returned pointer should match provided pointer");
    assertEquals(mod.useStore(value, { pointer: pointer }), pointer, "Should not trigger an error blocking false");

    // with override
    const value2 = 1;

    mod.useStore(value2, { pointer: pointer, override: true });

    assertEquals(mod.Stores.get<number>(pointer)!.state, value2, "Should match value2");

    // Add cb
    const finalValue = 2;
    let outputValue = mod.Stores.get<number>(pointer)!.state;
    const callback = (state: number) => outputValue = state;

    mod.useStore(finalValue, { pointer: pointer, onChange: callback });

    assertEquals(outputValue, value2, "Should equal value 2 before any changes");

    mod.Stores.get<number>(pointer)!.set(finalValue);

    assertEquals(outputValue, finalValue, "Should equal final value.");

    // Testing duplicate observers
    class ConcreteObserver implements mod.Observer<number> {
        public update(_subject: mod.Store<number>): void {
            return;
        }
    }

    const observer = new ConcreteObserver();

    assertThrows(
        () => {
            mod.useStore(finalValue, {
                pointer: pointer,
                override: true,
                errorHandling: { verbose: true, stopOnError: true },
                observers: [observer, observer] // Duplicate observers
            });
        },
        mod.DuplicateObserverError
    );

    assertThrows(
        () => {
            mod.useStore(finalValue, {
                pointer: pointer,
                override: false,
                errorHandling: { verbose: true, stopOnError: true },
                observers: [observer, observer] // Duplicate observers
            });
        },
        mod.DuplicateObserverError
    );
});

Deno.test("misc tests", () => {
    mod.StoreStack.configure();
});