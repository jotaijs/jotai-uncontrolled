import {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  experimental_use as use,
} from 'react';
import type { Context } from 'react';
import { SECRET_INTERNAL_getScopeContext as getScopeContext } from 'jotai';
import type { Atom } from 'jotai';

type ExtractContextValue<T> = T extends Context<infer V> ? V : never;

type Displayable = string | number;
type DisplayableAtom = Atom<Displayable | Promise<Displayable>>;
type Scope = NonNullable<Parameters<typeof getScopeContext>[0]>;
type Store = ExtractContextValue<ReturnType<typeof getScopeContext>>['s'];

const READ_ATOM = 'r';
const SUBSCRIBE_ATOM = 's';

type Unsubscribe = () => void;

type Options = {
  scope?: Scope;
  pending?: string;
};

// TODO support attributes like style, className, etc.

export function register(atom: DisplayableAtom, options?: Options) {
  const ScopeContext = getScopeContext(options?.scope);
  const store: Store = use(ScopeContext).s;
  let unsub: Unsubscribe | undefined;
  return (instance: unknown) => {
    unsub?.();
    if (instance instanceof Element) {
      unsub = store[SUBSCRIBE_ATOM](atom, () => {
        const atomState = store[READ_ATOM](atom);
        if ('e' in atomState) {
          throw atomState.e;
        }
        if ('p' in atomState) {
          if (options && 'pending' in options) {
            instance.textContent = options.pending;
          }
          return;
        }
        if ('v' in atomState) {
          instance.textContent = `${atomState.v}`;
          return;
        }
        throw new Error('no atom value');
      });
    }
  };
}
