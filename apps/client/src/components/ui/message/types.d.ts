import type * as React from 'react';

/** Props for MessageGroup. */
export type MessageGroupProps = React.ComponentProps<'div'>;

/** Props for Message. */
export type MessageProps = React.ComponentProps<'div'> & { align?: 'start' | 'end' };

/** Props for MessageAvatar. */
export type MessageAvatarProps = React.ComponentProps<'div'>;

/** Props for MessageContent. */
export type MessageContentProps = React.ComponentProps<'div'>;

/** Props for MessageHeader. */
export type MessageHeaderProps = React.ComponentProps<'div'>;

/** Props for MessageFooter. */
export type MessageFooterProps = React.ComponentProps<'div'>;
