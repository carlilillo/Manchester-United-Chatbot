import { APP_NAME } from '@/lib/site';
import { MemoryEditor } from './memory-editor';
import type { MemoryPageProps } from './types';

/** Introduces personal memory and mounts a fresh draft whenever this screen opens. */
export function MemoryPage({ memory, onSaved }: MemoryPageProps) {
  return (
    // The scroll container spans the whole content area so its scrollbar sits
    // at the page edge rather than beside the form.
    <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
      <section
        aria-labelledby="memory-title"
        className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 pt-10 pb-16 sm:px-6 sm:pt-16"
      >
        <header className="flex flex-col gap-2">
          <h1
            id="memory-title"
            className="font-heading text-4xl leading-none font-semibold sm:text-5xl"
          >
            Memory
          </h1>
          <p className="text-muted-foreground">Tell {APP_NAME} how you like your answers.</p>
        </header>
        <MemoryEditor memory={memory} onSaved={onSaved} />
      </section>
    </div>
  );
}
