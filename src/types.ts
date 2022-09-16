import type { Context, ReactNode } from 'react';
import type {
  Atom,
  SECRET_INTERNAL_getScopeContext as getScopeContext,
} from 'jotai';

export type ExtractContextValue<T> = T extends Context<infer V> ? V : never;

export type Displayable = string | number;
export type DisplayableAtom = Atom<Displayable | Promise<Displayable>>;
export type Scope = NonNullable<Parameters<typeof getScopeContext>[0]>;
export type Store = ExtractContextValue<
  ReturnType<typeof getScopeContext>
>['s'];

export type BaseOptions = {
  children?: DisplayableAtom | ReactNode | undefined;
  className?: DisplayableAtom | string | undefined;
  style?:
    | {
        [Key in keyof CSSStyleDeclaration]?:
          | DisplayableAtom
          | CSSStyleDeclaration[Key];
      }
    | undefined;
};
