import { assertEquals, assertInstanceOf, assertNotEquals, assertThrows } from "https://deno.land/std@0.151.0/testing/asserts.ts";
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