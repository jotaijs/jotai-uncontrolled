import React from 'react';

import { atom, useAtom, useSetAtom } from 'jotai';
import { register } from 'jotai-uncontrolled';

const countAtom = atom(0);

const UncontrolledCounter = () => {
  return (
    <div>
      <h1>Uncontrolled</h1>
      Count: <span ref={register(countAtom)} /> ({Math.random()})
    </div>
  );
};

const Counter = () => {
  const [count] = useAtom(countAtom);
  return (
    <div>
      <h1>Controlled</h1>
      Count: <span>{count}</span> ({Math.random()})
    </div>
  );
};

const Controls = () => {
  const setCount = useSetAtom(countAtom);
  return (
    <div>
      <button type="button" onClick={() => setCount((c) => c + 1)}>
        Increment
      </button>
    </div>
  );
};

const App = () => (
  <>
    <Controls />
    <UncontrolledCounter />
    <Counter />
  </>
);

export default App;
