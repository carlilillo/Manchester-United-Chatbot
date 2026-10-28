import type { Button } from '@/components/ui/button';
import type { codeBlockLineVariants, codeBlockVariants } from './variants';
import type { VariantProps } from 'class-variance-authority';
import type * as React from 'react';

/** Props for CodeBlock. */
export type CodeBlockProps = React.ComponentProps<'div'> &
  VariantProps<typeof codeBlockVariants> & { size?: 'default' | 'sm' };

/** Props for CodeBlockHeader. */
export type CodeBlockHeaderProps = React.ComponentProps<'div'>;

/** Props for CodeBlockTitle. */
export type CodeBlockTitleProps = React.ComponentProps<'div'>;

/** Props for CodeBlockActions. */
export type CodeBlockActionsProps = React.ComponentProps<'div'>;

/** Props for CodeBlockCopyButton. */
export type CodeBlockCopyButtonProps = React.ComponentProps<typeof Button> & { value: string };

/** Props for CodeBlockContent. */
export type CodeBlockContentProps = React.ComponentProps<'pre'> & {
  wrap?: boolean;
  lineNumbers?: boolean;
  startLine?: number;
};

/** Props for CodeBlockLine. */
export type CodeBlockLineProps = React.ComponentProps<'span'> &
  VariantProps<typeof codeBlockLineVariants>;

/** Props for CodeBlockFooter. */
export type CodeBlockFooterProps = React.ComponentProps<'div'>;
