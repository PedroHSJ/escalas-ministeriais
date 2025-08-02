"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface DevLayoutProps {
  children: React.ReactNode;
}

export function DevLayout({ children }: DevLayoutProps) {
  return <div className="min-h-screen bg-gray-50 w-full">{children}</div>;
}
