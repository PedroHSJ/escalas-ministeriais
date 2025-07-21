"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface DevLayoutProps {
  children: React.ReactNode;
}

export function DevLayout({ children }: DevLayoutProps) {
  const pathname = usePathname();

  if (process.env.NODE_ENV !== "development") {
    return <>{children}</>;
  }

  const devRoutes = [
    { name: "Dashboard", path: "/dashboard" },
    { name: "Companies", path: "/companies" },
    { name: "UANs", path: "/uans" },
    { name: "Team", path: "/team" },
    { name: "Inventory", path: "/inventory" },
    { name: "Settings", path: "/settings" },
    { name: "Onboarding", path: "/onboarding" },
    { name: "Login", path: "/login" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 w-full">
      {/* Barra de desenvolvimento */}
      <div className="bg-orange-500 text-white p-2 text-sm">
        <div className="container mx-auto flex items-center justify-between">
          <span>🚧 MODO DESENVOLVIMENTO</span>
          <div className="flex space-x-4">
            {devRoutes.map((route) => (
              <Link
                key={route.path}
                href={`${route.path}?dev=true`}
                className={`px-2 py-1 rounded ${
                  pathname === route.path
                    ? "bg-orange-700"
                    : "hover:bg-orange-600"
                }`}
              >
                {route.name}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {children}
    </div>
  );
}