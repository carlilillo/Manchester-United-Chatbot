import type { emptyMediaVariants } from './variants';
import type { VariantProps } from 'class-variance-authority';
import type * as React from 'react';

/** Props for Empty. */
export type EmptyProps = React.ComponentProps<'div'>;

/** Props for EmptyHeader. */
export type EmptyHeaderProps = React.ComponentProps<'div'>;

/** Props for EmptyMedia. */
export type EmptyMediaProps = React.ComponentProps<'div'> & VariantProps<typeof emptyMediaVariants>;

/** Props for EmptyTitle. */
export type EmptyTitleProps = React.ComponentProps<'div'>;

/** Props for EmptyDescription. */
export type EmptyDescriptionProps = React.ComponentProps<'p'>;

/** Props for EmptyContent. */
export type EmptyContentProps = React.ComponentProps<'div'>;
