import type { Socket } from "socket.io";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SocketUser } from "@/websocket/events";

function readToken(socket: Socket) {
  const authToken = socket.handshake.auth?.token;
  if (typeof authToken === "string" && authToken) return authToken.replace(/^Bearer\s+/i, "");

  const header = socket.handshake.headers.authorization;
  if (typeof header === "string" && header) return header.replace(/^Bearer\s+/i, "");

  return null;
}

export async function authenticateSocket(socket: Socket): Promise<SocketUser> {
  const token = readToken(socket);
  if (!token) throw new Error("Missing socket auth token");

  const supabase: any = createAdminClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) throw new Error("Invalid socket auth token");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) throw profileError;

  return {
    id: user.id,
    email: user.email,
    isAdmin: Boolean(profile?.is_admin),
  };
}
