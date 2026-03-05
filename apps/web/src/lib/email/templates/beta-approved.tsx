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
  email: string;
  password: string;
  appUrl: string;
}

export function BetaApprovedEmail({ email, password, appUrl }: Props) {
  return (
    <Html lang="pt">
      <Head />
      <Preview>O teu acesso à Beta do Aptis foi aprovado!</Preview>
      <Body style={{ backgroundColor: "#f4f4f5", fontFamily: "sans-serif" }}>
        <Container style={{ maxWidth: 560, margin: "40px auto", backgroundColor: "#fff", borderRadius: 8, padding: 32 }}>
          <Heading style={{ fontSize: 22, color: "#111" }}>
            O teu acesso à Beta foi aprovado! 🎉
          </Heading>
          <Text style={{ color: "#444", lineHeight: 1.6 }}>
            Obrigado por te candidatares ao Aptis. Foste selecionado para a nossa beta fechada — aqui estão os teus dados de acesso:
          </Text>
          <Container style={{ backgroundColor: "#f8fafc", borderRadius: 6, padding: "16px 20px", margin: "16px 0" }}>
            <Text style={{ margin: "4px 0", color: "#444", fontSize: 14 }}>
              <strong>Email:</strong> {email}
            </Text>
            <Text style={{ margin: "4px 0", color: "#444", fontSize: 14 }}>
              <strong>Palavra-passe:</strong>{" "}
              <code style={{ backgroundColor: "#e2e8f0", padding: "2px 6px", borderRadius: 4, fontFamily: "monospace" }}>
                {password}
              </code>
            </Text>
          </Container>
          <Text style={{ color: "#444", lineHeight: 1.6 }}>
            Recomendamos que alteres a palavra-passe após o primeiro login nas definições da conta.
          </Text>
          <Button
            href={`${appUrl}/login`}
            style={{
              backgroundColor: "#6366f1",
              color: "#fff",
              padding: "12px 24px",
              borderRadius: 6,
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Entrar no Aptis
          </Button>
          <Hr style={{ margin: "24px 0", borderColor: "#e5e7eb" }} />
          <Text style={{ color: "#444", lineHeight: 1.6, fontSize: 14 }}>
            Como utilizador beta, o teu feedback é muito importante. Não hesites em responder a este email com sugestões ou dificuldades que encontres.
          </Text>
          <Text style={{ color: "#9ca3af", fontSize: 12, marginTop: 24 }}>
            © {new Date().getFullYear()} Aptis · Se tiveres alguma questão, responde a este email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default BetaApprovedEmail;
