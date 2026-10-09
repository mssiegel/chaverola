import { useTranslation } from "react-i18next";

/** The teacher's four-step activity sequence, shared by both locales. */
export function SetupSteps() {
  const { t } = useTranslation("home");
  const items = [
    t("hero.step1"),
    t("hero.step2"),
    t("hero.step3"),
    t("hero.step4"),
  ];

  return (
    <div className="space-y-5">
      <h2 className="text-2xl leading-snug font-medium text-foreground sm:text-3xl">
        {t("hero.stepsLabel")}
      </h2>
      <ol className="space-y-3 text-lg leading-relaxed text-foreground/90">
        {items.map((step, i) => (
          <li key={step} className="flex gap-2.5">
            {/* Keep the period after the digit in either writing direction. */}
            <span dir="ltr" className="w-5 shrink-0 font-bold text-brand-grape">
              {i + 1}.
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
