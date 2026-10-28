import type { toggleVariants } from '@/components/ui/toggle-variants';
import type { Toggle as TogglePrimitive } from '@base-ui/react/toggle';
import type { ToggleGroup as ToggleGroupPrimitive } from '@base-ui/react/toggle-group';
import type { VariantProps } from 'class-variance-authority';

/** Props for ToggleGroup. */
export type ToggleGroupProps = ToggleGroupPrimitive.Props &
  VariantProps<typeof toggleVariants> & {
    spacing?: number;
    orientation?: 'horizontal' | 'vertical';
  };

/** Props for ToggleGroupItem. */
export type ToggleGroupItemProps = TogglePrimitive.Props & VariantProps<typeof toggleVariants>;

/** Styling shared between the group and each option. */
export type ToggleGroupContextValue = VariantProps<typeof toggleVariants> & {
  spacing?: number;
  orientation?: 'horizontal' | 'vertical';
};
