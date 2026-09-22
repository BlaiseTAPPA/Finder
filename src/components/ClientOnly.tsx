import { useState, useEffect, type ReactNode } from "react";

export function ClientOnly({
  children,
  fallback = null,
}: {
  children: ReactNode | (() => ReactNode);
  fallback?: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <>{fallback}</>;
  }

  return <>{typeof children === "function" ? children() : children}</>;
}
