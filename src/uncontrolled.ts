import { createElement } from 'react';
import type {
  ComponentProps,
  FunctionComponent,
  JSXElementConstructor,
} from 'react';
import { getDefaultStore } from 'jotai/vanilla';
import type { Atom } from 'jotai/vanilla';

type Store = ReturnType<typeof getDefaultStore>;

type Displayable = string | number;
type DisplayableAtom = Atom<Displayable | Promise<Displayable>>;

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

const EMPTY = Symbol();

const subscribe = <T>(
  store: Store,
  atom: Atom<T>,
  set: (v: Awaited<T>) => void,
  suspend?: () => void,
) => {
  let prevValue: T | typeof EMPTY = EMPTY;
  const setValue = (nextValue: Awaited<T>) => {
    if (!Object.is(prevValue, nextValue)) {
      set(nextValue);
      prevValue = nextValue;
    }
  };
  const callback = () => {
    const value = store.get(atom);
    if (value instanceof Promise) {
      if (suspend) {
        suspend();
        prevValue = EMPTY;
      }
      value.then(setValue);
    } else {
      setValue(value as Awaited<T>);
    }
  };
  const unsub = store.sub(atom, callback);
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
  atomStore?: Store;
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
  atomStore: Props['atomStore'],
  atomPending: Props['atomPending'],
  children: Props['children'],
  className: Props['className'],
  style: Props['style'],
  rest: {
    [key: string]: Atom<unknown> | unknown;
  },
) => {
  const store = atomStore || getDefaultStore();
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
    const { atomStore, atomPending, ...baseProps } = props;
    const { children, className, style, ...rest } = baseProps;
    return createElement(tag, {
      ...removeAtoms([baseProps])[0],
      ref: register(atomStore, atomPending, children, className, style, rest),
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
