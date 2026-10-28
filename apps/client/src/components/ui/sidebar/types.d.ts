import type { Button } from '@/components/ui/button';
import type { Input } from '@/components/ui/input';
import type { Separator } from '@/components/ui/separator';
import type { sidebarMenuButtonVariants } from './variants';
import type { TooltipContent } from '@/components/ui/tooltip/TooltipContent';
import type { useRender } from '@base-ui/react/use-render';
import type { VariantProps } from 'class-variance-authority';
import type * as React from 'react';

/** Props for SidebarProvider. */
export type SidebarProviderProps = React.ComponentProps<'div'> & {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

/** Props for Sidebar. */
export type SidebarProps = React.ComponentProps<'div'> & {
  side?: 'left' | 'right';
  variant?: 'sidebar' | 'floating' | 'inset';
  collapsible?: 'offcanvas' | 'icon' | 'none';
};

/** Props for SidebarTrigger. */
export type SidebarTriggerProps = React.ComponentProps<typeof Button>;

/** Props for SidebarRail. */
export type SidebarRailProps = React.ComponentProps<'button'>;

/** Props for SidebarInset. */
export type SidebarInsetProps = React.ComponentProps<'main'>;

/** Props for SidebarInput. */
export type SidebarInputProps = React.ComponentProps<typeof Input>;

/** Props for SidebarHeader. */
export type SidebarHeaderProps = React.ComponentProps<'div'>;

/** Props for SidebarFooter. */
export type SidebarFooterProps = React.ComponentProps<'div'>;

/** Props for SidebarSeparator. */
export type SidebarSeparatorProps = React.ComponentProps<typeof Separator>;

/** Props for SidebarContent. */
export type SidebarContentProps = React.ComponentProps<'div'>;

/** Props for SidebarGroup. */
export type SidebarGroupProps = React.ComponentProps<'div'>;

/** Props for SidebarGroupLabel. */
export type SidebarGroupLabelProps = useRender.ComponentProps<'div'> & React.ComponentProps<'div'>;

/** Props for SidebarGroupAction. */
export type SidebarGroupActionProps = useRender.ComponentProps<'button'> &
  React.ComponentProps<'button'>;

/** Props for SidebarGroupContent. */
export type SidebarGroupContentProps = React.ComponentProps<'div'>;

/** Props for SidebarMenu. */
export type SidebarMenuProps = React.ComponentProps<'ul'>;

/** Props for SidebarMenuItem. */
export type SidebarMenuItemProps = React.ComponentProps<'li'>;

/** Props for SidebarMenuButton. */
export type SidebarMenuButtonProps = useRender.ComponentProps<'button'> &
  React.ComponentProps<'button'> & {
    isActive?: boolean;
    tooltip?: string | React.ComponentProps<typeof TooltipContent>;
  } & VariantProps<typeof sidebarMenuButtonVariants>;

/** Props for SidebarMenuAction. */
export type SidebarMenuActionProps = useRender.ComponentProps<'button'> &
  React.ComponentProps<'button'> & {
    showOnHover?: boolean;
  };

/** Props for SidebarMenuBadge. */
export type SidebarMenuBadgeProps = React.ComponentProps<'div'>;

/** Props for SidebarMenuSkeleton. */
export type SidebarMenuSkeletonProps = React.ComponentProps<'div'> & {
  showIcon?: boolean;
};

/** Props for SidebarMenuSub. */
export type SidebarMenuSubProps = React.ComponentProps<'ul'>;

/** Props for SidebarMenuSubItem. */
export type SidebarMenuSubItemProps = React.ComponentProps<'li'>;

/** Props for SidebarMenuSubButton. */
export type SidebarMenuSubButtonProps = useRender.ComponentProps<'a'> &
  React.ComponentProps<'a'> & {
    size?: 'sm' | 'md';
    isActive?: boolean;
  };

/** Accepts either the next sidebar state or an update based on its current state. */
export type SidebarOpenUpdate = boolean | ((value: boolean) => boolean);
