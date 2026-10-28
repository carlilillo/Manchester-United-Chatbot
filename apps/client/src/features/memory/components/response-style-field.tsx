import { ToggleGroup } from '@/components/ui/toggle-group/ToggleGroup';
import { ToggleGroupItem } from '@/components/ui/toggle-group/ToggleGroupItem';
import type { ResponseStyleFieldProps } from './types';

/** Keeps the tone valid when the active toggle is pressed again. */
export function ResponseStyleField({ value, onChange }: ResponseStyleFieldProps) {
  function handleChange(values: unknown[]) {
    const chosen = values[0];
    if (chosen === 'formal' || chosen === 'friendly' || chosen === 'funny') onChange(chosen);
  }

  return (
    <div className="memory-field">
      <label id="response-style-label">RESPONSE STYLE</label>
      <p id="response-style-description">Choose the tone that feels right to you.</p>
      <ToggleGroup
        value={[value]}
        onValueChange={handleChange}
        variant="outline"
        aria-labelledby="response-style-label"
        aria-describedby="response-style-description"
      >
        <ToggleGroupItem value="formal">Formal</ToggleGroupItem>
        <ToggleGroupItem value="friendly">Friendly</ToggleGroupItem>
        <ToggleGroupItem value="funny">Funny</ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
