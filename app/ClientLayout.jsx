"use client";
import { LoaderProvider, useLoader } from '../context/LoaderContext';
import { Providers } from "./providers";

function LoaderOverlay() {
  const { isLoading } = useLoader();
  if (!isLoading) return null;
  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-[#3e2723]/70 backdrop-blur-sm">
      <div className="flex flex-col items-center">
        <div className="relative">
          <div className="animate-spin rounded-full h-24 w-24 border-t-8 border-b-8 border-[#bfa27a]" style={{ borderLeft: '8px solid #f3e5d8', borderRight: '8px solid #a67c52' }}></div>
          <span className="absolute inset-0 flex items-center justify-center text-5xl">☕️</span>
        </div>
        <span className="mt-6 text-xl font-bold text-[#bfa27a] animate-pulse">Loading...</span>
      </div>
    </div>
  );
}

export default function ClientLayout({ children }) {
  return (
    <LoaderProvider>
      <Providers>
        <LoaderOverlay />
        {children}
      </Providers>
    </LoaderProvider>
  );
}
