import { Field } from '@/components/ui/field/Field';
import { FieldTitle } from '@/components/ui/field/FieldTitle';
import { ToggleGroup } from '@/components/ui/toggle-group/ToggleGroup';
import { ToggleGroupItem } from '@/components/ui/toggle-group/ToggleGroupItem';
import { RESPONSE_STYLE_LABELS, RESPONSE_STYLES } from '@/features/memory/preferences';
import { responseStyleSchema } from '@united/contracts';
import type { ResponseStyleFieldProps } from './types';

/** Chooses the answer tone; pressing the active option again keeps it selected. */
export function ResponseStyleField({ value, onChange, className }: ResponseStyleFieldProps) {
  function handleChange(values: unknown[]) {
    // An empty selection (the active option pressed again) is ignored.
    const chosen = responseStyleSchema.safeParse(values[0]);
    if (chosen.success) onChange(chosen.data);
  }

  return (
    <Field orientation="responsive" className={className}>
      <FieldTitle id="response-style-label">Tone</FieldTitle>
      <ToggleGroup
        value={[value]}
        onValueChange={handleChange}
        variant="outline"
        spacing={0}
        aria-labelledby="response-style-label"
      >
        {RESPONSE_STYLES.map((style) => (
          <ToggleGroupItem key={style} value={style} className="px-3.5">
            {RESPONSE_STYLE_LABELS[style]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </Field>
  );
}
