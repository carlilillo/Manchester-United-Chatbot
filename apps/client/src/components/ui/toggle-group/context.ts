import * as React from 'react';
import type { ToggleGroupContextValue } from './types';

export const ToggleGroupContext = React.createContext<ToggleGroupContextValue>({
  size: 'default',
  variant: 'default',
  spacing: 2,
  orientation: 'horizontal',
});
