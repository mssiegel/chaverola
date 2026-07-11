import { Link } from "react-router-dom";
import type { ComponentProps } from "react";

import { useLocalePath } from "@/lib/locale";

type LocaleLinkProps = Omit<ComponentProps<typeof Link>, "to"> & {
  /** App-absolute path (without locale prefix), e.g. "/activity/join". */
  to: string;
};

/** A <Link> that preserves the active locale prefix (e.g. `/he`). */
export function LocaleLink({ to, ...props }: LocaleLinkProps) {
  const localePath = useLocalePath();
  return <Link to={localePath(to)} {...props} />;
}
