import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Heading,
  Text,
  Button,
  Hr,
} from "@react-email/components";
import * as React from "react";

interface Props {
  name: string;
  pendingMonths: number;
}

export function ReferralRewardEmail({ name, pendingMonths }: Props) {
  const label = pendingMonths === 1 ? "1 mês" : `${pendingMonths} meses`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://aptis.app";

  return (
    <Html lang="pt">
      <Head />
      <Preview>Parabéns! Ganhaste {label} de desconto no Aptis</Preview>
      <Body style={{ backgroundColor: "#f4f4f5", fontFamily: "sans-serif" }}>
        <Container style={{ maxWidth: 560, margin: "40px auto", backgroundColor: "#fff", borderRadius: 8, padding: 32 }}>
          <Heading style={{ fontSize: 22, color: "#111" }}>
            Parabéns, {name}! 🎉
          </Heading>
          <Text style={{ color: "#444", lineHeight: 1.6 }}>
            Um amigo que convidaste acabou de subscrever o Aptis. Como recompensa, ganhaste{" "}
            <strong>{label} de desconto</strong> na tua subscrição.
          </Text>
          <Text style={{ color: "#444", lineHeight: 1.6 }}>
            Podes aplicar o desconto a qualquer momento na tua página de referral.
          </Text>
          <Hr style={{ margin: "24px 0", borderColor: "#e5e7eb" }} />
          <Button
            href={`${appUrl}/referral`}
            style={{
              backgroundColor: "#6366f1",
              color: "#fff",
              padding: "12px 24px",
              borderRadius: 6,
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Ver a minha recompensa
          </Button>
          <Text style={{ color: "#9ca3af", fontSize: 12, marginTop: 24 }}>
            © {new Date().getFullYear()} Aptis · Continua a convidar amigos para ganhar mais meses!
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default ReferralRewardEmail;
