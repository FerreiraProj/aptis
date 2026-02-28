import { createClient } from "@/lib/supabase/server";
import { prisma } from "@aptis/database";
import { redirect } from "next/navigation";
import { ChatInterface } from "./chat-interface";

export const metadata = { title: "Tutor IA" };

export default async function ChatPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [conversations, documents, subjects] = await Promise.all([
    prisma.chatConversation.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      take: 30,
      select: {
        id: true,
        title: true,
        documentIds: true,
        updatedAt: true,
        _count: { select: { messages: true } },
      },
    }),
    prisma.document.findMany({
      where: { userId: user.id, status: "READY" },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        discipline: { select: { id: true, name: true, emoji: true, color: true } },
      },
    }),
    prisma.subject.findMany({
      where: { userId: user.id },
      select: { id: true, name: true, emoji: true, color: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return (
    <ChatInterface
      initialConversations={conversations}
      documents={documents}
      subjects={subjects}
      userId={user.id}
    />
  );
}
