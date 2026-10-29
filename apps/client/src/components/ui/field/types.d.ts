import type { Label } from '@/components/ui/label';
import type { fieldVariants } from './variants';
import type { VariantProps } from 'class-variance-authority';
import type * as React from 'react';

/** Props for FieldSet. */
export type FieldSetProps = React.ComponentProps<'fieldset'>;

/** Props for FieldLegend. */
export type FieldLegendProps = React.ComponentProps<'legend'> & { variant?: 'legend' | 'label' };

/** Props for FieldGroup. */
export type FieldGroupProps = React.ComponentProps<'div'>;

/** Props for Field. */
export type FieldProps = React.ComponentProps<'div'> & VariantProps<typeof fieldVariants>;

/** Props for FieldContent. */
export type FieldContentProps = React.ComponentProps<'div'>;

/** Props for FieldLabel. */
export type FieldLabelProps = React.ComponentProps<typeof Label>;

/** Props for FieldTitle. */
export type FieldTitleProps = React.ComponentProps<'div'>;

/** Props for FieldDescription. */
export type FieldDescriptionProps = React.ComponentProps<'p'>;
