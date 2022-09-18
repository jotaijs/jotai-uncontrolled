import React, { Suspense } from 'react';

import { atom, useAtom } from 'jotai';
import { uncontrolled } from 'jotai-uncontrolled';

const idAtom = atom(1);
const userAtom = atom(async (get) => {
  const response = await fetch(`https://reqres.in/api/users/${get(idAtom)}`);
  const { data } = await response.json();
  return `ID: ${data.id}, Name: ${data.first_name} ${data.last_name}`;
});

const createRandomColor = () => `#${Math.random().toString(16).slice(-6)}`;

const UncontrolledUser = () => {
  return (
    <uncontrolled.div
      style={{ backgroundColor: createRandomColor() }}
      atomPending="Loading..."
    >
      {atom((get) => `User: ${get(userAtom)}`)}
    </uncontrolled.div>
  );
};

const User = () => {
  const [user] = useAtom(userAtom);
  return (
    <div style={{ backgroundColor: createRandomColor() }}>User: {user}</div>
  );
};

const Controls = () => {
  const [id, setId] = useAtom(idAtom);
  return (
    <div>
      ID: {id}{' '}
      <button type="button" onClick={() => setId((c) => c - 1)}>
        Prev
      </button>{' '}
      <button type="button" onClick={() => setId((c) => c + 1)}>
        Next
      </button>
    </div>
  );
};

const App = () => (
  <>
    <Controls />
    <h1>Uncontrolled</h1>
    <UncontrolledUser />
    <h1>Controlled</h1>
    <Suspense fallback="Loading...">
      <User />
    </Suspense>
  </>
);

export default App;
