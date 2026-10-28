import type { SourceLinkProps } from './types';

/** Opens cited sources separately while preserving the current conversation. */
export function SourceLink({ href, children }: SourceLinkProps) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}
