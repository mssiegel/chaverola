import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import { useLocalePath } from "@/lib/locale";
import { Button } from "@/components/ui/button";
import { DEMO_JOIN_CODE } from "@/mockData";

/** `/activity/join` — student enters a 4-digit join code. */
export function JoinCodePage() {
  const [code, setCode] = useState("");
  const navigate = useNavigate();
  const localePath = useLocalePath();

  const isValid = /^\d{4}$/.test(code);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (isValid) navigate(localePath(`/activity/join/${code}`));
  };

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-6 px-4 py-12 text-center">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-foreground">Join a chat</h1>
        <p className="text-muted-foreground">
          Enter the 4-digit code from your teacher.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
        <input
          value={code}
          onChange={(event) =>
            setCode(event.target.value.replace(/\D/g, "").slice(0, 4))
          }
          inputMode="numeric"
          autoFocus
          aria-label="Join code"
          placeholder="1234"
          className="w-full rounded-2xl border border-input bg-card py-4 text-center text-3xl font-semibold tracking-[0.4em] shadow-sm outline-none focus:border-brand-grape focus:ring-2 focus:ring-brand-grape/20"
        />
        <Button type="submit" size="lg" disabled={!isValid} className="w-full">
          Join
          <ArrowRight className="size-4" />
        </Button>
      </form>

      <p className="text-sm text-muted-foreground">
        Demo code{" "}
        <button
          type="button"
          onClick={() => setCode(DEMO_JOIN_CODE)}
          className="font-semibold text-brand-grape underline-offset-2 hover:underline"
        >
          {DEMO_JOIN_CODE}
        </button>{" "}
        always works.
      </p>
    </div>
  );
}
