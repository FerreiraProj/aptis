"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { BetaApplyModal } from "./beta-apply-modal";

export function BetaApplyButton({ className }: { className?: string }) {
  const t = useTranslations("beta");
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)} className={className}>
        {t("applyButton")}
      </button>
      <BetaApplyModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
