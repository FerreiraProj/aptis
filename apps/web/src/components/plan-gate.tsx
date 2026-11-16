"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UpgradeDialog } from "@/components/upgrade-dialog";

type GatedFeature = "examSimulator" | "studyPlan";

/**
 * Full-page placeholder shown instead of a paid feature on plans that don't include it.
 * The server already blocks the corresponding API — this is the friendly UI side.
 */
export function PlanGate({ feature }: { feature: GatedFeature }) {
  const t = useTranslations("planGate");
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t(`${feature}.title`)}</h1>
      </div>
      <Card variant="glass" className="border-dashed border-primary/30">
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Lock size={28} className="text-primary" />
          </div>
          <div className="max-w-md space-y-1">
            <h3 className="font-semibold">{t("lockedTitle")}</h3>
            <p className="text-sm text-muted-foreground">
              {t(`${feature}.description`)}
            </p>
          </div>
          <Button className="btn-gradient" onClick={() => setOpen(true)}>
            {t("upgradeButton")}
          </Button>
        </CardContent>
      </Card>
      <UpgradeDialog open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
