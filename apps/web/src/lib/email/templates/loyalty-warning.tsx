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
  pct: number;
}

export function LoyaltyWarningEmail({ name, pct }: Props) {
  return (
    <Html lang="pt">
      <Head />
      <Preview>{`O teu desconto de fidelidade de ${pct}% foi removido`}</Preview>
      <Body style={{ backgroundColor: "#f4f4f5", fontFamily: "sans-serif" }}>
        <Container style={{ maxWidth: 560, margin: "40px auto", backgroundColor: "#fff", borderRadius: 8, padding: 32 }}>
          <Heading style={{ fontSize: 22, color: "#111" }}>
            Olá, {name}
          </Heading>
          <Text style={{ color: "#444", lineHeight: 1.6 }}>
            A tua subscrição Aptis foi cancelada, o que significa que o teu desconto de fidelidade de{" "}
            <strong>{pct}%</strong> foi removido automaticamente.
          </Text>
          <Text style={{ color: "#444", lineHeight: 1.6 }}>
            Se voltares a subscrever, podes contactar o suporte para saber se podes recuperar o desconto.
          </Text>
          <Hr style={{ margin: "24px 0", borderColor: "#e5e7eb" }} />
          <Button
            href={process.env.NEXT_PUBLIC_APP_URL ?? "https://aptis.app"}
            style={{
              backgroundColor: "#6366f1",
              color: "#fff",
              padding: "12px 24px",
              borderRadius: 6,
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Voltar ao Aptis
          </Button>
          <Text style={{ color: "#9ca3af", fontSize: 12, marginTop: 24 }}>
            © {new Date().getFullYear()} Aptis · Se tiveres alguma questão, responde a este email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default LoyaltyWarningEmail;
