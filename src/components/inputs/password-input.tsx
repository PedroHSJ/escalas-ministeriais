import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import clsx from "clsx";
import { Eye, EyeOff } from "lucide-react";

interface PasswordInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  error?: string;
  value?: string;
  placeholder?: string;
  onChange?: (e: any) => void;
}

export function PasswordInput({
  id,
  label,
  error,
  value,
  placeholder,
  onChange,
  ...rest
}: PasswordInputProps) {
  const [show, setShow] = useState(false);

  return (
    <div className="grid w-full max-w-sm items-center gap-2">
      <Label htmlFor={id} className={clsx(error && "text-destructive")}>
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          type={show ? "text" : "password"}
          className={clsx(
            error &&
              "border-destructive focus:ring-destructive focus:border-destructive",
            "pr-10"
          )}
          {...rest}
        />
        <button
          type="button"
          tabIndex={-1}
          className="absolute inset-y-0 right-2 flex items-center text-gray-500 hover:cursor-pointer"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Ocultar senha" : "Mostrar senha"}
        >
          {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}
