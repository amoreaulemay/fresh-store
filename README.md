# Fresh Store

![Build Passing](https://github.com/amoreaulemay/fresh-store/actions/workflows/deno.yml/badge.svg) [![](https://img.shields.io/codecov/c/gh/amoreaulemay/fresh-store?style=flat-square)](https://codecov.io/gh/amoreaulemay/fresh-store) ![CodeQL](https://github.com/amoreaulemay/fresh-store/workflows/CodeQL/badge.svg)

A minimal store for Fresh, to allow communication between islands. It attach stores to the `window` component. It uses "pointers" or "keys" to associate stores. A pointer can either be provided, or auto-generated.

## Usage

Creating a store.

```typescript
const ptr = useStore("Initial Value", { onChange: (state) => console.log(state) });

console.log(Stores.get<string>(ptr)?.state);
Stores.get<string>(ptr)?.set("Modified Value");
```

```
Output:
Initial Value
Modified Value
```

Creating a store and providing a pointer.

```typescript
const pointer = Store.newPointer();
useStore(
    "Initial Value", 
    {
        pointer: pointer,
        onChange: (newState) => console.log(`New value: ${newState}`)
    },
);

console.log(Stores.get<string>(ptr)?.state);
Stores.get<string>(ptr)?.set("Modified Value");
```

```
Output:
Initial Value
New value: Modified Value
```

## Creating a new Observer

```typescript
const storePtr = useStore("New Store");

class ConcreteObserver implements Observer<T> {
    public update(subject: Store<T>): void {
        console.log("The store was updated, new state: ", subject.state);
    }
}

Stores.get(storePtr)?.attach(new ConcreteObserver());
```

## Example usage in components

```tsx
// ./islands/componentA.tsx

/** @jsx h */
import { h } from "preact";
import { Stores, useStore, type Pointer } from "@store";

interface CompAProps {
    storePtr: Pointer;
}

export default function ComponentA(props: CompAProps) {
    useStore(0, { pointer: props.storePtr });

    const increment = () => 
        Stores
            .get<number>(props.storePtr)
            ?.set((state) => state + 1);
    
    const decrement = () =>
       Stores
            .get<number>(props.storePtr)
            ?.set((state) => state - 1);
    
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
import { useState } from "preact/hooks";

import { useStore, type Pointer } from "@store";

interface CompBProps {
    storePtr: Pointer;
}

export default function ComponentB(props: CompBProps) {
    const [counter, setCounter] = useState(0);
    useStore(counter, {
        pointer: props.storePtr,
        onChange: (newState) => setCounter(newState),
    });

    return <p>Counter: {counter}</p>;
}
```

```tsx
// ./routes/index.tsx

/** @jsx h */
import { h } from "preact";

import { Store } from "@store";

import ComponentA from "@islands/componentA.tsx";
import ComponentB from "@islands/componentB.tsx";

export default function Index() {
    const storePtr = Store.newPointer();

    return (
        <div>
            <ComponentA storePtr={storePtr} />
            <ComponentB storePtr={storePtr} />
        </div>
    );
}
```
