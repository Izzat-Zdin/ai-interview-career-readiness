import * as React from 'react';
import { cn } from '@/lib/utils';

const TabsContext = React.createContext(null);

function Tabs({ value, defaultValue, onValueChange, children, className }) {
  const [internalValue, setInternalValue] = React.useState(defaultValue || '');
  const isControlled = value !== undefined;
  const selectedValue = isControlled ? value : internalValue;

  const select = React.useCallback(
    (val) => {
      if (!isControlled) setInternalValue(val);
      onValueChange?.(val);
    },
    [isControlled, onValueChange]
  );

  return (
    <TabsContext.Provider value={{ value: selectedValue, select }}>
      <div className={cn('w-full', className)}>{children}</div>
    </TabsContext.Provider>
  );
}

function TabsList({ children, className }) {
  return (
    <div
      className={cn(
        'inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground',
        className
      )}
    >
      {children}
    </div>
  );
}

function TabsTrigger({ value, children, className, disabled }) {
  const { value: selectedValue, select } = React.useContext(TabsContext);
  const active = selectedValue === value;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      disabled={disabled}
      onClick={() => select(value)}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
        active && 'bg-background text-foreground shadow-sm',
        className
      )}
    >
      {children}
    </button>
  );
}

function TabsContent({ value, children, className }) {
  const { value: selectedValue } = React.useContext(TabsContext);
  if (selectedValue !== value) return null;
  return (
    <div role="tabpanel" className={cn('mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2', className)}>
      {children}
    </div>
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
