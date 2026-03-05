import { redirect } from "next/navigation";
import { prisma } from "@aptis/database";
import { RegisterForm } from "./register-form";

export default async function RegisterPage() {
  const siteConfig = await prisma.siteConfig.findFirst().catch(() => null);
  if (siteConfig?.betaModeEnabled) {
    redirect("/");
  }

  return <RegisterForm />;
}
