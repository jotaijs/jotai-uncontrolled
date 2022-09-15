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

type Options = {
  text?: DisplayableAtom;
  className?: DisplayableAtom;
  style?: Partial<{
    [key in keyof CSSStyleDeclaration]: DisplayableAtom;
  }>;
  attrs?: {
    [key: string]: DisplayableAtom;
  };
  scope?: Scope;
  pending?: string;
};

export function register(options: Options) {
  const ScopeContext = getScopeContext(options.scope);
  const store: Store = use(ScopeContext).s;
  const unsubs: Unsubscribe[] = [];
  return (instance: unknown) => {
    unsubs.forEach((unsub) => unsub());
    unsubs.splice(0);
    if (instance instanceof Element) {
      if (options.text) {
        unsubs.push(
          subscribe(store, options.text, (v) => {
            instance.textContent = `${v}`;
          }),
          () => {
            if ('pending' in options) {
              instance.textContent = options.pending;
            }
          },
        );
      }
      if (options.className) {
        unsubs.push(
          subscribe(store, options.className, (v) => {
            instance.className = `${v}`;
          }),
        );
      }
      if (options.attrs) {
        Object.entries(options.attrs).forEach(([key, atom]) => {
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
