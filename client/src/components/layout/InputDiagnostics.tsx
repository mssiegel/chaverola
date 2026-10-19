import { useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const EVENT_TYPES = [
  "keydown",
  "keypress",
  "keyup",
  "beforeinput",
  "input",
  "textInput",
  "compositionstart",
  "compositionupdate",
  "compositionend",
] as const;
const SPECIAL_KEYS = new Set([
  "Enter",
  "Return",
  "Unidentified",
  "Process",
  "Dead",
  "Shift",
  "Backspace",
  "Delete",
  "Tab",
  "Escape",
]);
type TraceRow = Record<string, string | number | boolean | null>;

/** Opt-in, local-only event metadata. Never store typed text, names or URLs. */
export function InputDiagnostics() {
  const { t } = useTranslation();
  const eventsRef = useRef<TraceRow[]>([]);
  const [open, setOpen] = useState(false);
  const [report, setReport] = useState("");
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  useLayoutEffect(() => {
    const started = performance.now();
    const record = (event: Event, phase: string) => {
      const field = event.target;
      if (
        !(field instanceof HTMLTextAreaElement) ||
        !field.hasAttribute("data-chat-composer")
      )
        return;
      const keyboard = event instanceof KeyboardEvent ? event : null;
      const rawData = "data" in event ? event.data : null;
      const data = typeof rawData === "string" ? rawData : null;
      eventsRef.current.push({
        ms: Math.round(performance.now() - started),
        type: event.type,
        phase,
        key: keyboard
          ? SPECIAL_KEYS.has(keyboard.key)
            ? keyboard.key
            : "character"
          : null,
        keyCode: keyboard
          ? [0, 13, 229].includes(keyboard.keyCode)
            ? keyboard.keyCode
            : "other"
          : null,
        shift: keyboard?.shiftKey ?? null,
        inputType:
          "inputType" in event && typeof event.inputType === "string"
            ? event.inputType
            : null,
        dataKind:
          data === null
            ? "none"
            : data === "\n"
              ? "lf"
              : data === "\r"
                ? "cr"
                : data === "\r\n"
                  ? "crlf"
                  : /[\r\n]/.test(data)
                    ? "contains-break"
                    : "text",
        composing:
          "isComposing" in event && typeof event.isComposing === "boolean"
            ? event.isComposing
            : null,
        cancelable: event.cancelable,
        trusted: event.isTrusted,
        prevented: event.defaultPrevented,
        length: field.value.length,
        lineBreaks: (field.value.match(/\n/g) ?? []).length,
        focused: document.activeElement === field,
        enterKeyHint: field.enterKeyHint,
      });
      if (eventsRef.current.length > 80) eventsRef.current.shift();
    };
    const capture = (event: Event) => record(event, "capture");
    const bubble = (event: Event) => record(event, "bubble");
    for (const type of EVENT_TYPES) {
      document.addEventListener(type, capture, true);
      document.addEventListener(type, bubble);
    }
    return () => {
      for (const type of EVENT_TYPES) {
        document.removeEventListener(type, capture, true);
        document.removeEventListener(type, bubble);
      }
    };
  }, []);

  const showReport = () => {
    setReport(
      JSON.stringify(
        {
          version: "input-trace-v1",
          browser: navigator.userAgent,
          locale: document.documentElement.lang,
          viewportWidth: window.innerWidth,
          events: eventsRef.current,
        },
        null,
        2
      )
    );
    setCopied(false);
    setCopyFailed(false);
    setOpen(true);
  };
  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      setCopyFailed(false);
    } catch {
      setCopyFailed(true);
    }
  };

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={showReport}
        className="pointer-events-auto ms-auto shrink-0 rounded-full"
      >
        {t("debug.input.button")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("debug.input.title")}</DialogTitle>
            <DialogDescription>
              {t("debug.input.instructions")}
            </DialogDescription>
          </DialogHeader>
          <pre
            dir="ltr"
            className="max-h-[45dvh] overflow-auto rounded-lg bg-muted p-3 text-start text-xs select-text"
          >
            {report}
          </pre>
          {copyFailed && (
            <p className="text-sm">{t("debug.input.copyFallback")}</p>
          )}
          <Button type="button" onClick={copyReport}>
            {t(copied ? "debug.input.copied" : "debug.input.copy")}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
