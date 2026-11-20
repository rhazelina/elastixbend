# React

The binding lives at a separate entry point so the core stays framework-free:

```tsx
import { Bend, useBend, useBendPhase, useBendRef } from "elastixbend/react";
```

React is an optional peer dependency. The binding never exposes the pull through
`useState`; a 60 Hz React re-render is the exact cost this library exists to
avoid.

## `<Bend>`

```tsx
<Bend preset="edge" className="stage">
  <Content />
</Bend>
```

`<Bend>` renders a wrapper `<div>` around its children, creates the instance on
mount, and destroys it on unmount.

| Prop | Type | Notes |
|---|---|---|
| `children` | `ReactNode` | Required |
| `className` | `string` | Applied to the wrapper |
| `style` | `React.CSSProperties` | Applied to the wrapper |
| `onStateChange` | `(state: BendState) => void` | Called every frame the pull changes |
| …`BendOptions` | | Every option from the [options reference](/reference/options) |

Options are read once on mount. Changing them later does **not** remount the
instance. If you need a different configuration, remount with a `key`:

```tsx
<Bend key={preset} preset={preset}>
  <Content />
</Bend>
```

The wrapper is the element that moves. Keep `position: fixed` children outside
it, or use `render="cssVar"`.

## Hooks

### `useBend()`

Returns the nearest `BendInstance`, or `null` outside a `<Bend>`. Use it for
imperative calls:

```tsx
function SettleButton() {
  const bend = useBend();
  return <button onClick={() => bend?.settle()}>Settle</button>;
}
```

### `useBendPhase()`

Returns the current `Phase` and re-renders **only** when the phase changes. Use
it for classes or attributes, never for the pull value.

```tsx
function Status() {
  const phase = useBendPhase();
  return <span data-phase={phase} />;
}
```

### `useBendRef()`

Returns a mutable ref whose `current` is updated every frame, and never causes a
render. Read it inside `requestAnimationFrame`, an effect, or an external
ticker:

```tsx
function Readout() {
  const bend = useBendRef();

  useEffect(() => {
    let id = 0;
    const tick = () => {
      console.log(bend.current.pull);
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [bend]);

  return null;
}
```

Do not read `ref.current` during render and expect updates; it is deliberately
outside React's render cycle.

## SSR

`<Bend>` renders its wrapper on the server and starts the effect in
`useEffect`, so it is safe to render during SSR. The core module is also safe to
import on the server; only calling `createBend` needs a browser.
