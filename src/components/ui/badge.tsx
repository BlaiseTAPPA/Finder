import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "text-fine inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-transparent px-2.5 py-1 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        /* status signals — tinted, borderless */
        neutral: "bg-surface-sunken text-ink-2",
        positive: "bg-price-low/12 text-price-low",
        caution: "bg-price-mid/14 text-ink-2",
        negative: "bg-destructive/10 text-destructive",
        outline: "border-border text-foreground",
        /* solid */
        default: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        destructive: "bg-destructive text-destructive-foreground",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
