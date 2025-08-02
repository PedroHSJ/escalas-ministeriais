"use client";

import * as React from "react";
import Link from "next/link";
import { useNavigation } from "@/contexts/NavigationContext";
import { useNavigationWithLoading } from "@/hooks/useNavigationWithLoading";

interface NavigationLinkProps extends React.ComponentProps<typeof Link> {
  href: string;
  onClick?: () => void;
  children: React.ReactNode;
}

export function NavigationLink({
  href,
  onClick,
  children,
  ...props
}: NavigationLinkProps) {
  const { isNavigating } = useNavigation();
  const { navigateTo } = useNavigationWithLoading();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onClick) {
      onClick();
    }
    navigateTo(href);
  };

  return (
    <Link
      {...props}
      href={href}
      onClick={handleClick}
      style={{
        pointerEvents: isNavigating ? "none" : "auto",
        opacity: isNavigating ? 0.6 : 1,
        ...props.style,
      }}
    >
      {children}
    </Link>
  );
}
