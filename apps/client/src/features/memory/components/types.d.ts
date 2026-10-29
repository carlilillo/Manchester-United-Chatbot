import type { Memory } from '@united/contracts';
import type { MemorySavedHandler } from '../types';

/** Props for MemoryEditor. */
export type MemoryEditorProps = {
  memory: Memory;
  onSaved: MemorySavedHandler;
};

/** Props for MemoryPage. */
export type MemoryPageProps = {
  memory: Memory;
  onSaved: MemorySavedHandler;
};

export interface ResponseStyleFieldProps {
  value: Memory['responseStyle'];
  onChange: (value: Memory['responseStyle']) => void;
  className?: string;
}
