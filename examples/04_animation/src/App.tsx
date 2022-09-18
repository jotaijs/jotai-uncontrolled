import React, { useEffect, useState } from 'react';

import { atom, useAtomValue, useSetAtom } from 'jotai';
import { uncontrolled } from 'jotai-uncontrolled';

const xAtom = atom(100);
const yAtom = atom(100);

const UncontrolledComponent = () => {
  return (
    <uncontrolled.div
      style={{
        position: 'relative',
        left: xAtom,
        top: yAtom,
      }}
    >
      Hello
    </uncontrolled.div>
  );
};

const Component = () => {
  const x = useAtomValue(xAtom);
  const y = useAtomValue(yAtom);
  return (
    <div
      style={{
        position: 'relative',
        left: x,
        top: y,
      }}
    >
      Hello
    </div>
  );
};

const Controls = () => {
  const setX = useSetAtom(xAtom);
  const setY = useSetAtom(yAtom);
  useEffect(() => {
    let active = true;
    const loop = () => {
      if (!active) return;
      const rad = performance.now() / 100;
      setX(100 + Math.cos(rad) * 100);
      setY(100 + Math.sin(rad) * 100);
      requestAnimationFrame(loop);
    };
    loop();
    return () => {
      active = false;
    };
  }, [setX, setY]);
  return null;
};

const App = () => {
  const [mode, setMode] = useState('controlled');
  return (
    <>
      <button
        type="button"
        onClick={() =>
          setMode((x) => (x === 'controlled' ? 'uncontrolled' : 'controlled'))
        }
      >
        {mode}
      </button>
      <hr />
      <Controls />
      {mode === 'uncontrolled' && (
        <>
          <h1>Uncontrolled</h1>
          {[...Array(10000).keys()].map((i) => (
            <UncontrolledComponent key={i} />
          ))}
        </>
      )}
      {mode === 'controlled' && (
        <>
          <h1>Controlled</h1>
          {[...Array(10000).keys()].map((i) => (
            <Component key={i} />
          ))}
        </>
      )}
    </>
  );
};

export default App;
