import * as React from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const SelectContext = React.createContext(null);

function Select({ value, onValueChange, children, defaultValue, disabled }) {
  const [open, setOpen] = React.useState(false);
  const [internalValue, setInternalValue] = React.useState(defaultValue || '');
  const isControlled = value !== undefined;
  const selectedValue = isControlled ? value : internalValue;
  const containerRef = React.useRef(null);

  React.useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleSelect = (val) => {
    if (disabled) return;
    if (!isControlled) setInternalValue(val);
    onValueChange?.(val);
    setOpen(false);
  };

  return (
    <SelectContext.Provider value={{ value: selectedValue, onSelect: handleSelect, open, setOpen, disabled }}>
      <div ref={containerRef} className="relative w-full">{children}</div>
    </SelectContext.Provider>
  );
}

const SelectTrigger = React.forwardRef(({ className, children, ...props }, ref) => {
  const { open, setOpen, value, disabled } = React.useContext(SelectContext);
  return (
    <button
      ref={ref}
      type="button"
      role="combobox"
      aria-expanded={open}
      disabled={disabled}
      onClick={() => !disabled && setOpen(!open)}
      className={cn(
        'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      <span className="truncate">{children}</span>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </button>
  );
});
SelectTrigger.displayName = 'SelectTrigger';

const SelectValue = ({ placeholder }) => {
  const { value } = React.useContext(SelectContext);
  return <span className={value ? '' : 'text-muted-foreground'}>{value || placeholder}</span>;
};

const SelectContent = ({ children, className }) => {
  const { open } = React.useContext(SelectContext);
  if (!open) return null;
  return (
    <div
      className={cn(
        'absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md',
        className
      )}
    >
      {children}
    </div>
  );
};

const SelectItem = ({ value, children, className, disabled: itemDisabled }) => {
  const { value: selectedValue, onSelect } = React.useContext(SelectContext);
  const active = selectedValue === value;
  return (
    <div
      role="option"
      aria-selected={active}
      onClick={() => !itemDisabled && onSelect(value)}
      className={cn(
        'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        active && 'bg-accent text-accent-foreground',
        className
      )}
    >
      <span className="flex-1">{children}</span>
      {active && <Check className="h-4 w-4" />}
    </div>
  );
};

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
