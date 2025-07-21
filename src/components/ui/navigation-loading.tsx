"use client";

import { useNavigation } from "@/contexts/NavigationContext";

export function NavigationLoading() {
  const { isNavigating } = useNavigation();

  if (!isNavigating) return null;

  return (
    <>
      {/* Barra de progresso no topo */}
      <div className="fixed top-0 left-0 w-full h-1 bg-gray-200 z-50">
        <div
          className="h-full bg-blue-600 transition-all duration-300 ease-out"
          style={{
            width: "70%",
            animation: "loading-bar 2s ease-in-out infinite",
          }}
        />
      </div>

      {/* Overlay opcional (descomente se quiser) */}
      {/* 
      <div className="fixed inset-0 bg-black/10 z-40 flex items-center justify-center">
        <div className="bg-white p-4 rounded-lg shadow-lg flex items-center space-x-3">
          <div className="w-5 h-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
          <span className="text-sm text-gray-600">Carregando...</span>
        </div>
      </div>
      */}

      <style jsx>{`
        @keyframes loading-bar {
          0% {
            width: 0%;
          }
          50% {
            width: 70%;
          }
          100% {
            width: 100%;
          }
        }
      `}</style>
    </>
  );
}