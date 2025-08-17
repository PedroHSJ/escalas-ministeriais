import { Input } from "@/components/ui/input";
import { IMaskInput } from "react-imask";
import { Label } from "@/components/ui/label";
import clsx from "clsx";

interface InputWithLabelProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  error?: string;
  mask?: string; // ex: "(00) 00000-0000"
  value?: string;
  placeholder?: string;
  type?: string; // ex: "email", "password"
  onChange?: (e: any) => void;
}

export function InputWithLabel({
  id,
  label,
  error,
  mask,
  value,
  placeholder,
  type,
  onChange,
}: InputWithLabelProps) {
  return (
    <div className="grid w-full max-w-sm items-center gap-2">
      <Label htmlFor={id} className={clsx(error && "text-destructive")}>
        {label}
      </Label>

      {mask ? (
        <IMaskInput
          mask={mask}
          value={value}
          placeholder={placeholder}
          onAccept={(val: string) => onChange?.({ target: { value: val } })}
          unmask={true} // retorna apenas os números
          className={clsx(
            "w-full border rounded-md px-3 py-1",
            error &&
              "border-destructive focus:ring-destructive focus:border-destructive"
          )}
          type={type || "text"}
        />
      ) : (
        <Input
          id={id}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          type={type}
          className={clsx(
            error &&
              "border-destructive focus:ring-destructive focus:border-destructive"
          )}
        />
      )}

      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}
