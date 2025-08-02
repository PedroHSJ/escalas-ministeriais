"use client";

import * as React from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { type VariantProps } from "class-variance-authority";
import { useNavigation } from "@/contexts/NavigationContext";
import { useNavigationWithLoading } from "@/hooks/useNavigationWithLoading";
import { Loader2 } from "lucide-react";

interface NavigationButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  href: string;
  onClick?: () => void;
  disabled?: boolean;
  showLoader?: boolean;
  asChild?: boolean;
}

export function NavigationButton({
  href,
  onClick,
  disabled,
  children,
  showLoader = true,
  variant,
  size,
  className,
  ...props
}: NavigationButtonProps) {
  const { isNavigating } = useNavigation();
  const { navigateTo } = useNavigationWithLoading();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onClick) {
      onClick();
    }
    navigateTo(href);
  };

  const isDisabled = disabled || isNavigating;

  return (
    <Button
      {...props}
      variant={variant}
      size={size}
      className={className}
      disabled={isDisabled}
      onClick={handleClick}
    >
      {/* {isNavigating && showLoader && (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      )} */}
      {children}
    </Button>
  );
}
