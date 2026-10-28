import type { Dialog as SheetPrimitive } from '@base-ui/react/dialog';
import type * as React from 'react';

/** Props for Sheet. */
export type SheetProps = SheetPrimitive.Root.Props;

/** Props for SheetTrigger. */
export type SheetTriggerProps = SheetPrimitive.Trigger.Props;

/** Props for SheetClose. */
export type SheetCloseProps = SheetPrimitive.Close.Props;

/** Props for SheetPortal. */
export type SheetPortalProps = SheetPrimitive.Portal.Props;

/** Props for SheetOverlay. */
export type SheetOverlayProps = SheetPrimitive.Backdrop.Props;

/** Props for SheetContent. */
export type SheetContentProps = SheetPrimitive.Popup.Props & {
  side?: 'top' | 'right' | 'bottom' | 'left';
  showCloseButton?: boolean;
};

/** Props for SheetHeader. */
export type SheetHeaderProps = React.ComponentProps<'div'>;

/** Props for SheetFooter. */
export type SheetFooterProps = React.ComponentProps<'div'>;

/** Props for SheetTitle. */
export type SheetTitleProps = SheetPrimitive.Title.Props;

/** Props for SheetDescription. */
export type SheetDescriptionProps = SheetPrimitive.Description.Props;
