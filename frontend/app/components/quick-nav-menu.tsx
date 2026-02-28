import { Link } from "react-router";
import { Menu } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "~/components/ui/sheet";

export type QuickNavItem = {
  label: string;
  path: string;
  description: string;
};

export function QuickNavMenu({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: QuickNavItem[];
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Menu className="mr-2 h-4 w-4" />
          Menu
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{subtitle}</SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-3">
          {items.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="block rounded-lg border p-3 transition-colors hover:bg-muted/40"
            >
              <p className="text-sm font-semibold">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.description}</p>
            </Link>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

