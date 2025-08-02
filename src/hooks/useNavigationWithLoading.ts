"use client";

import { useRouter } from "next/navigation";
import { useNavigation } from "@/contexts/NavigationContext";
import { useCallback } from "react";

export function useNavigationWithLoading() {
  const router = useRouter();
  const { setIsNavigating } = useNavigation();

  const navigateTo = useCallback(
    (url: string) => {
      setIsNavigating(true);
      router.push(url);
    },
    [router, setIsNavigating]
  );

  const navigateBack = useCallback(() => {
    setIsNavigating(true);
    router.back();
  }, [router, setIsNavigating]);

  const navigateReplace = useCallback(
    (url: string) => {
      setIsNavigating(true);
      router.replace(url);
    },
    [router, setIsNavigating]
  );

  return {
    navigateTo,
    navigateBack,
    navigateReplace,
  };
}
