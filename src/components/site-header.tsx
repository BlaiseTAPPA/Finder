/** Kopfleiste: kompakt mit Menü-Sheet auf Mobile, horizontale Navigation ab md. */
import { useState } from "react";
import { BellRing, Fuel, LogIn, Menu, Route as RouteIcon, Star, Target } from "lucide-react";
import { Link } from "react-router-dom";
import { SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";
import { useIsClerkEnabled } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type MainTab = "search" | "trip" | "favorites";

interface Props {
  tab: MainTab;
  onTab: (tab: MainTab) => void;
  favoritesCount: number;
}

const ITEMS: { value: MainTab; label: string; icon: typeof Target }[] = [
  { value: "search", label: "Umkreis", icon: Target },
  { value: "trip", label: "Trajet", icon: RouteIcon },
  { value: "favorites", label: "Favoriten", icon: Star },
];

export function SiteHeader({ tab, onTab, favoritesCount }: Props) {
  const [open, setOpen] = useState(false);
  const isClerkEnabled = useIsClerkEnabled();

  return (
    <header className="sticky top-0 z-30 bg-ink pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 md:h-12">
        <Fuel className="size-4 shrink-0 text-on-dark" />
        <span className="truncate text-caption font-medium text-on-dark">Tankstellen-Finder</span>

        {/* Navigation ab md */}
        <nav className="ml-auto hidden items-center gap-1 md:flex">
          {ITEMS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => onTab(item.value)}
              className={cn(
                "text-fine rounded-full px-3 py-1.5 transition-colors",
                tab === item.value
                  ? "bg-on-dark/15 text-on-dark"
                  : "text-on-dark/60 hover:text-on-dark",
              )}
            >
              {item.label}
              {item.value === "favorites" && favoritesCount > 0 ? ` (${favoritesCount})` : ""}
            </button>
          ))}
        </nav>

        {/* Konto */}
        {isClerkEnabled && (
          <div className="ml-auto flex items-center gap-1 md:ml-2">
            <SignedIn>
              <Link
                to="/alerts"
                aria-label="Preisalarme"
                className="flex size-11 items-center justify-center rounded-full text-on-dark/80 transition-colors hover:bg-on-dark/10 hover:text-on-dark md:size-9"
              >
                <BellRing className="size-4" />
              </Link>
              <span className="flex size-11 items-center justify-center md:size-9">
                <UserButton afterSignOutUrl="/" />
              </span>
            </SignedIn>
            <SignedOut>
              <Link
                to="/sign-in"
                className="text-fine flex min-h-11 items-center gap-1.5 rounded-full px-3 text-on-dark/80 transition-colors hover:bg-on-dark/10 hover:text-on-dark md:min-h-9"
              >
                <LogIn className="size-4" />
                <span className="hidden sm:inline">Anmelden</span>
              </Link>
            </SignedOut>
          </div>
        )}

        {/* Menü auf Mobile */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Menü öffnen"
              className="size-11 shrink-0 text-on-dark hover:bg-on-dark/10 hover:text-on-dark md:hidden"
            >
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[85vw] max-w-xs">
            <SheetHeader>
              <SheetTitle>Navigation</SheetTitle>
            </SheetHeader>
            <div className="mt-4 flex flex-col gap-1 px-4">
              {ITEMS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => {
                    onTab(item.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "text-caption flex min-h-11 items-center gap-3 rounded-lg px-3 text-left transition-colors",
                    tab === item.value
                      ? "bg-parchment font-semibold text-ink"
                      : "text-ink-muted hover:bg-parchment",
                  )}
                >
                  <item.icon className="size-4 text-primary" />
                  {item.label}
                  {item.value === "favorites" && favoritesCount > 0 ? ` (${favoritesCount})` : ""}
                </button>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
