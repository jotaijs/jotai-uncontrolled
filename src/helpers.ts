import type { DisplayableAtom } from './types';

export const isAtom = (atom: unknown): atom is DisplayableAtom =>
  typeof (atom as DisplayableAtom)?.read === 'function';
