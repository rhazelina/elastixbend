---
description: Read the live pull from React without re-rendering on every frame.
---

# Read the pull from React without re-renders

The React binding exposes the phase and a mutable ref. It deliberately does not
expose the pull through `useState`.

## Goal

A component that changes a CSS class when the phase changes, and a readout that
shows the live pull without 60 renders per second.

## Steps

1. Import from the React subpath.

   ```tsx
   import { Bend, useBendPhase, useBendRef } from "elastixbend/react";
   import { useEffect } from "react";
   ```

2. Wrap the content you want to move.

   ```tsx
   export function Stage() {
     return (
       <Bend preset="edge" className="stage">
         <Content />
         <Status />
         <Readout />
       </Bend>
     );
   }
   ```

3. Use the phase for visual state.

   ```tsx
   function Status() {
     const phase = useBendPhase();
     return <span data-phase={phase}>{phase}</span>;
   }
   ```

4. Read the pull inside a frame loop.

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

## Result

`useBendPhase` re-renders only when the phase changes. `useBendRef` never
re-renders; its `current` is updated every frame with the live pull, velocity,
and phase.

## Caveat

Do not read `ref.current` during render and expect it to update. It lives outside
React's render cycle. If you need to change options, remount `<Bend>` with a
different `key`, because instance options are immutable.

## Next

- [Read the full React guide](/guide/react)
- [Use `cssVar` with an existing transform](/reference/renderers)
