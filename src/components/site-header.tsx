/** Kopfleiste: Marke, Konto und Menü-Sheet auf Mobile (Bereichs-Tabs liegen in der Seite). */
import { useState } from "react";
import { BellRing, LogIn, Menu, Route as RouteIcon, Star, Target } from "lucide-react";
import { Link } from "react-router-dom";
import { SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";
import { useIsClerkEnabled } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { DataCredits } from "@/components/data-credits";

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
    <header className="sticky top-0 z-30 bg-chrome pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-safe md:h-12">
        {/* Wortmarke in der Ziffernschrift der Preise statt Stock-Icon */}
        <span className="text-body truncate font-figure font-semibold text-on-chrome">
          Tankstellen<span className="text-on-chrome/55">-Finder</span>
        </span>

        {/* Bereichswahl übernimmt die Tab-Leiste der Seite; hier nur Konto + Mobil-Menü. */}
        <div className="flex-1" />

        {/* Konto */}
        {isClerkEnabled && (
          <div className="flex items-center gap-1">
            <SignedIn>
              <Link
                to="/alerts"
                aria-label="Preisalarme"
                className="flex size-11 items-center justify-center rounded-full text-on-chrome/80 transition-colors hover:bg-on-chrome/10 hover:text-on-chrome md:pointer-fine:size-9"
              >
                <BellRing className="size-4" />
              </Link>
              <span className="flex size-11 items-center justify-center md:pointer-fine:size-9">
                <UserButton afterSignOutUrl="/" />
              </span>
            </SignedIn>
            <SignedOut>
              <Link
                to="/sign-in"
                className="text-fine flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-3 text-on-chrome/80 transition-colors hover:bg-on-chrome/10 hover:text-on-chrome md:pointer-fine:min-h-9"
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
              className="shrink-0 rounded-full text-on-chrome hover:bg-on-chrome/10 hover:text-on-chrome md:hidden"
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
                      ? "bg-surface-sunken font-semibold text-foreground"
                      : "text-ink-2 hover:bg-surface-sunken",
                  )}
                >
                  <item.icon className="size-4 text-primary" />
                  {item.label}
                  {item.value === "favorites" && favoritesCount > 0 ? ` (${favoritesCount})` : ""}
                </button>
              ))}
            </div>
            <DataCredits className="text-fine absolute inset-x-0 bottom-0 border-t px-6 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-muted-foreground" />
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
