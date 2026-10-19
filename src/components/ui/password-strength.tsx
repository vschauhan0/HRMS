import * as React from "react"
import { Check, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface PasswordStrengthProps {
 password?: string
 className?: string
}

export function PasswordStrength({ password = "", className }: PasswordStrengthProps) {
 const criteria = [
 { label: "At least 8 characters", met: password.length >= 8 },
 { label: "One uppercase letter", met: /[A-Z]/.test(password) },
 { label: "One lowercase letter", met: /[a-z]/.test(password) },
 { label: "One number", met: /[0-9]/.test(password) },
 { label: "One special character", met: /[^A-Za-z0-9]/.test(password) },
 ]

 const metCount = criteria.filter((c) => c.met).length
 const strengthPercentage = (metCount / criteria.length) * 100

 let strengthColor = "bg-destructive"
 let strengthLabel = "Weak"
 
 if (metCount === criteria.length) {
 strengthColor = "bg-green-500"
 strengthLabel = "Strong"
 } else if (metCount >= 3) {
 strengthColor = "bg-yellow-500"
 strengthLabel = "Fair"
 } else if (metCount > 0) {
 strengthColor = "bg-destructive"
 strengthLabel = "Weak"
 } else {
 strengthColor = "bg-muted"
 strengthLabel = ""
 }

 return (
 <div className={cn("flex flex-col gap-3", className)}>
 <div className="flex flex-col gap-1.5">
 <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
 <div
 className={cn("h-full transition-all duration-300 ease-in-out", strengthColor)}
 style={{ width: `${strengthPercentage}%` }}
 />
 </div>
 <div className="text-xs font-medium text-muted-foreground text-right h-4">
 {strengthLabel && <span>{strengthLabel}</span>}
 </div>
 </div>
 
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
 {criteria.map((item, index) => (
 <div key={index} className="flex items-center gap-2">
 {item.met ? (
 <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
 ) : (
 <X className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
 )}
 <span className={item.met ? "text-foreground" : ""}>{item.label}</span>
 </div>
 ))}
 </div>
 </div>
 )
}
