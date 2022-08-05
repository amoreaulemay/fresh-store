import { assertEquals, assertInstanceOf } from "https://deno.land/std@0.151.0/testing/asserts.ts";
import * as mod from "../mod.ts";

// Testing setup
Deno.test("The StoreStack should be able to be instantiated", () => {
    const Stores = new mod.StoreStack() as unknown;

    assertInstanceOf(Stores, mod.StoreStack, "Stores should be instance of StoreStack");
});

Deno.test("window.stores should be of instance StoreStack when importing mod.ts", () => {
    assertInstanceOf(window.stores as unknown, mod.StoreStack, "window.stores was expected to be instantiated");
});

// Testing creating a new store
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
    let ouput = "";
    const expectedResult = "Test";

    class ConcreteObserver implements mod.Observer<string> {
        public update(subject: mod.Store<string>): void {
            ouput = subject.state;
        }
    }

    const store = new mod.Store(ouput);
    store.attach(new ConcreteObserver());

    assertEquals(store.state, ouput, "The ouput should equal the state");

    store.set(expectedResult);

    assertEquals(store.state, expectedResult, "The ouput should equal the expectedResult");
});

Deno.test("set can reuse a previous state to modify it", () => {
    const ouput = 0;
    const store = new mod.Store(ouput);

    assertEquals(store.state, ouput, `The state should equal ${ouput}`);

    store.set((prevState) => prevState + 1);

    assertEquals(store.state, ouput + 1, "The state should increment by 1");
});