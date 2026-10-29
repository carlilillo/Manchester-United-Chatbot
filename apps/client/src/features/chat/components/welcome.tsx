import { cn } from 'cn';
import { chatColumnClassName } from './chat-column';

/** Opens an empty conversation with one question; the composer sits right below it. */
export function Welcome() {
  return (
    // `mt-auto` here and on the disclaimer split the free space, centring the
    // headline and composer together without remounting the composer.
    <section aria-labelledby="welcome-title" className={cn(chatColumnClassName, 'mt-auto pb-7')}>
      <h1
        id="welcome-title"
        className="font-heading text-[clamp(2.75rem,7vw,4.75rem)] leading-[0.95] font-semibold tracking-[-0.01em] text-balance animate-in duration-700 fade-in slide-in-from-bottom-2"
      >
        What do you want to know today?
      </h1>
    </section>
  );
}
