import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, ...props }, ref) => {
    return (
      <label className="flex items-center cursor-pointer">
        <input
          type="checkbox"
          ref={ref}
          checked={checked}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          className="sr-only"
          {...props}
        />
        <div
          className={cn(
            "w-4 h-4 border rounded flex items-center justify-center transition-colors",
            checked
              ? "bg-primary border-primary"
              : "border-gray-300 bg-white",
            className
          )}
        >
          {checked && <Check className="w-3 h-3 text-white" />}
        </div>
      </label>
    )
  }
)
Checkbox.displayName = "Checkbox"

export { Checkbox }
