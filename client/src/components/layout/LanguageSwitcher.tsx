import { useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, Globe } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { switchLocalePath, useLocale, type Locale } from "@/lib/locale";

const LOCALE_INITIALS: Record<Locale, string> = {
  en: "EN",
  he: "עב",
};

/**
 * Navbar language dropdown. Picking a language swaps the `/he` prefix on the
 * current URL in place (search/hash preserved); from there `LocaleLink`
 * keeps the chosen locale on every internal navigation. Both locales render
 * English text for now — translation and RTL come later.
 */
export function LanguageSwitcher() {
  const locale = useLocale();
  const { pathname, search, hash } = useLocation();
  const navigate = useNavigate();

  const handleChange = (value: string) => {
    const next = value as Locale;
    if (next === locale) return;
    navigate(`${switchLocalePath(pathname, next)}${search}${hash}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Change language"
          className="gap-1.5 px-2.5 text-muted-foreground hover:text-foreground"
        >
          <Globe className="size-4" />
          <span>{LOCALE_INITIALS[locale]}</span>
          <ChevronDown className="size-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[6rem]">
        <DropdownMenuRadioGroup value={locale} onValueChange={handleChange}>
          <DropdownMenuRadioItem value="en">
            {LOCALE_INITIALS.en}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="he">
            {LOCALE_INITIALS.he}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
