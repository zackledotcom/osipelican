import * as React from "react";
import { cn } from "@/lib/utils";

interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, checked, onCheckedChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onCheckedChange?.(e.target.checked);
    };

    return (
      <div className="relative inline-flex h-4 w-7 items-center">
        <input
          type="checkbox"
          ref={ref}
          checked={checked}
          onChange={handleChange}
          className={cn(
            "peer sr-only",
            className
          )}
          {...props}
        />
        <div
          className={cn(
            "absolute inset-0 rounded-full transition-colors",
            checked
              ? "bg-mint-400 dark:bg-coral-400"
              : "bg-gray-200 dark:bg-gray-700"
          )}
        />
        <div
          className={cn(
            "absolute left-0.5 h-3 w-3 rounded-full bg-white transition-transform",
            checked ? "translate-x-3" : "translate-x-0"
          )}
        />
      </div>
    );
  }
);

Switch.displayName = "Switch";

export { Switch }; 