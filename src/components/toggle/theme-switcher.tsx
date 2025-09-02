"use client";

import React from "react";
import { Moon, Sun } from "lucide-react";

import { Switch } from "@/components/ui/switch";
import { useTheme } from "next-themes";

export default function ThemeSwitcher() {
  const [checked, setChecked] = React.useState(false);
  const { setTheme } = useTheme();

  return (
    <div className="flex items-center space-x-3">
      <Sun className="size-4" />
      <Switch
        className="hover:cursor-pointer"
        checked={checked}
        onCheckedChange={(value) => {
            setChecked(value);
            value ? setTheme("dark") : setTheme("light");
        }}
        aria-label="Toggle theme"
      />
      <Moon className="size-4" />
    </div>
  );
}
