import { supabase } from "@/integrations/supabase/client";
import type { ContactMessage } from "@/types";

type MessageRow = {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  is_read: boolean | null;
  created_at: string | null;
};

function mapMessage(row: MessageRow): ContactMessage {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    subject: row.subject,
    message: row.message,
    isRead: row.is_read,
    createdAt: row.created_at,
  };
}

export async function sendMessage(input: {
  name: string;
  email: string;
  subject?: string | null;
  message: string;
}) {
  const { error } = await supabase.from("contact_messages").insert({
    name: input.name,
    email: input.email,
    subject: input.subject ?? null,
    message: input.message,
  });
  if (error) throw error;
}

export async function getMessages(): Promise<ContactMessage[]> {
  const { data, error } = await supabase
    .from("contact_messages")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as MessageRow[]).map(mapMessage);
}

export async function setMessageRead(id: string, isRead: boolean) {
  const { error } = await supabase
    .from("contact_messages")
    .update({ is_read: isRead })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteMessage(id: string) {
  const { error } = await supabase.from("contact_messages").delete().eq("id", id);
  if (error) throw error;
}
