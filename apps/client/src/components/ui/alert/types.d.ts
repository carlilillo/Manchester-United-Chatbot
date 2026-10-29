import type { alertVariants } from './variants';
import type { VariantProps } from 'class-variance-authority';
import type * as React from 'react';

/** Props for Alert. */
export type AlertProps = React.ComponentProps<'div'> & VariantProps<typeof alertVariants>;

/** Props for AlertTitle. */
export type AlertTitleProps = React.ComponentProps<'div'>;

/** Props for AlertDescription. */
export type AlertDescriptionProps = React.ComponentProps<'div'>;

/** Props for AlertAction. */
export type AlertActionProps = React.ComponentProps<'div'>;
