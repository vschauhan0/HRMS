import * as React from "react"
import { Eye, EyeOff, Lock } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

export interface PasswordInputProps
 extends React.InputHTMLAttributes<HTMLInputElement> {
 icon?: React.ReactNode;
}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
 ({ className, icon, ...props }, ref) => {
 const [showPassword, setShowPassword] = React.useState(false)

 return (
 <div className="relative">
 {icon && (
 <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
 {icon}
 </div>
 )}
 <Input
 type={showPassword ? "text" : "password"}
 className={cn("pr-10", icon ? "pl-10" : "", className)}
 ref={ref}
 {...props}
 />
 <button
 type="button"
 onClick={() => setShowPassword((prev) => !prev)}
 className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
 >
 {showPassword ? (
 <EyeOff className="h-4 w-4" />
 ) : (
 <Eye className="h-4 w-4" />
 )}
 <span className="sr-only">
 {showPassword ? "Hide password" : "Show password"}
 </span>
 </button>
 </div>
 )
 }
)
PasswordInput.displayName = "PasswordInput"

export { PasswordInput }
