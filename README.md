# Fresh Store

A minimal store for Fresh, to allow communication between islands. It attach stores to the `window` component. It uses "pointers" or "keys" to associate stores. A pointer can either be provided, or auto-generated.

## Usage

Creating a store.

```typescript
const ptr = useStore(
    "Initial Value", 
    (newState) => console.log(`New value: ${newState}`),
);

console.log(window.stores.get<string>(ptr).state);
window.stores.get<string>(ptr).set("Modified Value");
```

```
Output:
Initial Value
New value: Modified Value
```

Creating a store and providing a pointer.

```typescript
const ptr = crypto.randomUUID();
useStore(
    "Initial Value",
    (newState) => console.log(`New value: ${newState}`),
    ptr,
);

console.log(window.stores.get<string>(ptr).state);
window.stores.get<string>(ptr).set("Modified Value");
```

```
Output:
Initial Value
New value: Modified Value
```

## Creating a new Observer

```typescript
const storePtr = useStore("New Store", (_) => null);

class ConcreteObserver implements Observer<T> {
    public update(subject: Store<T>): void {
        console.log("The store was updated, new state: ", subject.state);
    }
}

window.stores.get(storePtr).attach(new ConcreteObserver());
```

## Example usage in components

```tsx
// ./islands/componentA.tsx

/** @jsx h */
import { h } from "preact";

interface CompAProps {
    storePtr: string;
}

export default function ComponentA(props: CompAProps) {
    useStore<number>(0, () => null, props.storePtr);

    const increment = () => 
        window.stores
            .get<number>(props.storePtr)
            .set((state) => state + 1);
    
    const decrement = () =>
        window.stores
            .get<number>(props.storePtr)
            .set((state) => state - 1);
    
    return (
        <div>
            <button onClick={decrement}>-1</button>
            <button onClick={increment}>+1</button>
        </div>
    );
}
```

```tsx
// ./islands/componentB.tsx

/** @jsx h */
import { h } from "preact";
import { useEffect, useState } from "preact/hooks";

// Change depending on your import_map
import type { Observer, Store } from "@store";
import { StoreStack } from "@store";

interface CompBProps {
    storePtr: string;
}

class CounterObserver implements Observer<number> {
    public update(subject: Store<number>) {
        setCounter(subject.state);
    }
}

const observer = new CounterObserver();

export default function ComponentB(props: CompBProps) {
    const [counter, setCounter] = useState(0);

    useEffect(() => {
        StoreStack.configure();
        window.stores.upsert<number>(counter, props.storePtr, observer);

        return () => window.stores.get(props.storePtr).detach(observer);
    }, [counter]);

    return <p>Counter: {counter}</p>;
}
```

```tsx
// ./routes/index.tsx

/** @jsx h */
import { h } from "preact";

import ComponentA from "@islands/componentA.tsx";
import ComponentB from "@islands/componentB.tsx";

export default function Index() {
    const storePtr = crypto.randomUUID();

    return (
        <div>
            <ComponentA storePtr={storePtr} />
            <ComponentB storePtr={storePtr} />
        </div>
    );
}
```