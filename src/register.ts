import {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  experimental_use as use,
} from 'react';
import { SECRET_INTERNAL_getScopeContext as getScopeContext } from 'jotai';

import type {
  Store,
  DisplayableAtom,
  Displayable,
  Scope,
  BaseOptions,
} from './types';
import { isAtom } from './helpers';

const READ_ATOM = 'r';
const SUBSCRIBE_ATOM = 's';

type Unsubscribe = () => void;

const subscribe = (
  store: Store,
  atom: DisplayableAtom,
  set: (v: Displayable) => void,
  suspend?: () => void,
) => {
  const unsub = store[SUBSCRIBE_ATOM](atom, () => {
    const atomState = store[READ_ATOM](atom);
    if ('e' in atomState) {
      throw atomState.e;
    }
    if ('p' in atomState) {
      suspend?.();
      return;
    }
    if ('v' in atomState) {
      set(atomState.v);
      return;
    }
    throw new Error('no atom value');
  });
  return unsub;
};

type Options = BaseOptions & {
  scope?: Scope;
  pending?: string;
  attrs?: {
    [key: string]: DisplayableAtom | unknown;
  };
};

export function register(options: Options) {
  const ScopeContext = getScopeContext(options.scope);
  const store: Store = use(ScopeContext).s;
  const unsubs: Unsubscribe[] = [];
  return (instance: unknown) => {
    unsubs.forEach((unsub) => unsub());
    unsubs.splice(0);
    if (instance instanceof Element) {
      if (isAtom(options.children)) {
        unsubs.push(
          subscribe(store, options.children, (v) => {
            instance.textContent = `${v}`;
          }),
          () => {
            if ('pending' in options) {
              instance.textContent = options.pending;
            }
          },
        );
      }
      if (isAtom(options.className)) {
        unsubs.push(
          subscribe(store, options.className, (v) => {
            instance.className = `${v}`;
          }),
        );
      }
      if (options.attrs) {
        Object.entries(options.attrs).forEach(([key, atom]) => {
          if (isAtom(atom))
            unsubs.push(
              subscribe(store, atom, (v) => {
                instance.setAttribute(
                  key,
                  typeof v === 'number' ? `${v}px` : `${v}`,
                );
              }),
            );
        });
      }
    }
    if (instance instanceof HTMLElement) {
      if (options.style) {
        Object.entries(options.style).forEach(([key, atom]) => {
          if (isAtom(atom))
            unsubs.push(
              subscribe(store, atom as DisplayableAtom, (v) => {
                (instance.style as any)[key] =
                  typeof v === 'number' ? `${v}px` : `${v}`;
              }),
            );
        });
      }
    }
  };
}
