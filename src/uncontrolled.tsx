import React from 'react';
import type { FC } from 'react';
import { isAtom } from './helpers';

import type { BaseOptions, DisplayableAtom } from './types';

import { register } from './register';

type TagProps = BaseOptions & {
  [key: string]: DisplayableAtom | unknown;
};

// TODO: I don't like this function, pretty shitty
const removeAtoms = (props: {
  style?: Record<string, unknown> | undefined;
  [key: string]: unknown;
}) => {
  return Object.keys(props)
    .filter((key) => !isAtom(props[key]))
    .reduce((acc: TagProps, key) => {
      acc[key] =
        key === 'style' && !!props.style
          ? removeAtoms(props.style)
          : props[key];
      return acc;
    }, {});
};

const components: Record<string, FC<TagProps>> = {};

export const uncontrolled = new Proxy<Record<string, FC<TagProps>>>(
  {},
  {
    get(target, tag: string) {
      components[tag] ??= (props: TagProps) => {
        const { style, className, children, ...rest } = props;
        const CustomTag = `${tag}`;

        return (
          <CustomTag
            // eslint-disable-next-line react/jsx-props-no-spreading
            {...removeAtoms(props)}
            // TODO: idk how to fix this TS issue
            ref={register({
              style,
              className,
              children,
              attrs: rest,
            })}
          />
        );
      };

      return components[tag];
    },
  },
);
