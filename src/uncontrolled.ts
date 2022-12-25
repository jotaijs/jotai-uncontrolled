/// <reference types="react/experimental" />

import { createElement, use as experimentalUse, useContext } from 'react';
import type {
  ComponentProps,
  Context,
  FunctionComponent,
  JSXElementConstructor,
} from 'react';
import { SECRET_INTERNAL_getScopeContext as getScopeContext } from 'jotai';
import type { Atom } from 'jotai';

let use = experimentalUse;
if (!use) {
  // TODO this is a temporary workaround
  // eslint-disable-next-line no-console
  console.warn(
    'experimental_use is not available. Falling back to useContext. It may not work as expected due to rules of hooks.',
  );
  use = useContext as any;
}

type ExtractContextValue<T> = T extends Context<infer V> ? V : never;

type Displayable = string | number;
type DisplayableAtom = Atom<Displayable | Promise<Displayable>>;
type Scope = NonNullable<Parameters<typeof getScopeContext>[0]>;
type Store = ExtractContextValue<ReturnType<typeof getScopeContext>>['s'];

const isAtomLike = (atom: unknown): atom is { read: (...args: any[]) => any } =>
  typeof (atom as any)?.read === 'function';

const removeAtoms = <T>(xa: [T]): [T] | [] => {
  const [x] = xa;
  if (isAtomLike(x)) {
    return [];
  }
  if (Array.isArray(x)) {
    const x2 = x.flatMap((item) => removeAtoms([item]));
    return x2.length === x.length && x2.every((item, i) => item === x[i])
      ? xa
      : [x2 as T];
  }
  if (typeof x === 'object' && x !== null) {
    const entries = Object.entries(x);
    const entries2 = entries.flatMap(([key, value]) => {
      const value2 = removeAtoms([value]);
      return value2.length === 0 ? [] : [[key, value2[0]] as const];
    });
    return entries2.length === entries.length &&
      entries2.every(([k, v]) => v === (x as Record<string, unknown>)[k])
      ? xa
      : [Object.fromEntries(entries2) as T];
  }
  return xa;
};

const READ_ATOM = 'r';
const SUBSCRIBE_ATOM = 's';
const EMPTY = Symbol();

const subscribe = <T>(
  store: Store,
  atom: Atom<T | Promise<T>>,
  set: (v: T) => void,
  suspend?: () => void,
) => {
  let prevValue: T | typeof EMPTY = EMPTY;
  const callback = () => {
    const atomState = store[READ_ATOM](atom);
    if ('e' in atomState) {
      throw atomState.e;
    }
    if ('p' in atomState) {
      if (suspend) {
        suspend();
        prevValue = EMPTY;
      }
      atomState.p.then(callback);
      return;
    }
    if ('v' in atomState) {
      if (!Object.is(prevValue, atomState.v)) {
        set(atomState.v);
        prevValue = atomState.v;
      }
      return;
    }
    throw new Error('no atom value');
  };
  const unsub = store[SUBSCRIBE_ATOM](atom, callback);
  callback();
  return unsub;
};

type Props<
  T extends {
    children?: unknown;
    className?: unknown;
    style?: unknown;
  } = object,
> = {
  atomScope?: Scope;
  atomPending?: string;
  children?: DisplayableAtom | T['children'];
  className?: DisplayableAtom | T['className'];
  style?: {
    [Key in keyof NonNullable<T['style']>]?:
      | DisplayableAtom
      | NonNullable<T['style']>[Key];
  };
} & {
  [Key in Exclude<keyof T, 'children' | 'className' | 'style'>]?:
    | Atom<Displayable | boolean | Promise<Displayable | boolean>>
    | T[Key];
};

const register = (
  atomScope: Props['atomScope'],
  atomPending: Props['atomPending'],
  children: Props['children'],
  className: Props['className'],
  style: Props['style'],
  rest: {
    [key: string]: Atom<unknown> | unknown;
  },
) => {
  const ScopeContext = getScopeContext(atomScope);
  const store: Store = use(ScopeContext).s;
  const unsubs: (() => void)[] = [];
  return (instance: any) => {
    unsubs.splice(0).forEach((unsub) => unsub());
    if (!instance) {
      return;
    }
    if (isAtomLike(children)) {
      unsubs.push(
        subscribe(
          store,
          children,
          (v) => {
            instance.textContent = v;
          },
          () => {
            if (atomPending !== undefined) {
              instance.textContent = atomPending;
            }
          },
        ),
      );
    }
    if (isAtomLike(className)) {
      unsubs.push(
        subscribe(store, className, (v) => {
          instance.className = v;
        }),
      );
    }
    if (style) {
      Object.entries(style).forEach(([key, atom]) => {
        if (isAtomLike(atom))
          unsubs.push(
            subscribe(store, atom, (v) => {
              instance.style[key] = typeof v === 'number' ? `${v}px` : v;
            }),
          );
      });
    }
    Object.entries(rest).forEach(([key, atom]) => {
      if (isAtomLike(atom))
        unsubs.push(
          subscribe(store, atom, (v) => {
            if (instance.setAttribute && typeof v === 'string') {
              instance.setAttribute(key, v);
            } else {
              instance[key] = v;
            }
          }),
        );
    });
  };
};

const createUncontrolledComponent = (tag: any) => {
  const component = (props: Props) => {
    const { atomScope, atomPending, ...baseProps } = props;
    const { children, className, style, ...rest } = baseProps;
    return createElement(tag, {
      ...removeAtoms([baseProps])[0],
      ref: register(atomScope, atomPending, children, className, style, rest),
    });
  };
  return component;
};

const componentMap = new Map<unknown, FunctionComponent<Props>>();

export const uncontrolled = new Proxy<any>(
  () => {
    // empty
  },
  {
    get(_target, tag: string) {
      if (!componentMap.has(tag)) {
        componentMap.set(tag, createUncontrolledComponent(tag));
      }
      return componentMap.get(tag);
    },
    apply(_target, _thisArg, [tag]) {
      if (!componentMap.has(tag)) {
        componentMap.set(tag, createUncontrolledComponent(tag));
      }
      return componentMap.get(tag);
    },
  },
) as Record<string, FunctionComponent<Props>> & {
  [Tag in keyof JSX.IntrinsicElements]: FunctionComponent<
    Props<JSX.IntrinsicElements[Tag]>
  >;
} & (<T extends keyof JSX.IntrinsicElements | JSXElementConstructor<any>>(
    tag: T,
  ) => FunctionComponent<Props<ComponentProps<T>>>) &
  ((tag: unknown) => FunctionComponent<Props>);
