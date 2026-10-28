import { MemoryEditor } from './memory-editor';
import { Settings2 } from 'lucide-react';
import type { MemoryPageProps } from './types';

/** Introduces personal memory and mounts a fresh draft whenever this screen opens. */
export function MemoryPage({ memory, onSaved }: MemoryPageProps) {
  return (
    <section className="memory-page" aria-labelledby="memory-title">
      <div className="section-kicker">
        <span>01 / PERSONALISATION</span>
        <span>YOUR SETTINGS</span>
      </div>
      <div className="memory-heading">
        <div className="memory-symbol">
          <Settings2 size={28} />
        </div>
        <h1 id="memory-title">Make it yours.</h1>
        <p>
          Set how United Archive responds to you in every conversation. Your preferences stay under
          your control.
        </p>
      </div>
      <MemoryEditor memory={memory} onSaved={onSaved} />
    </section>
  );
}
