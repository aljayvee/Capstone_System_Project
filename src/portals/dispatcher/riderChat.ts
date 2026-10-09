import { useEffect, useState } from "react";
import { onValue, push, ref, update } from "firebase/database";
import { database } from "../../firebase/config";

/**
 * Where a dispatcher's conversation with a rider lives.
 *
 * "shared": one thread per rider, `rider_chats/<riderId>`, which every
 * dispatcher reads and writes. Dispatcher A's chat with a rider was open to
 * dispatcher B, which the user ruled out on 2026-10-07: every account owns its
 * own conversations.
 *
 * "threads": one thread per dispatcher and rider,
 * `rider_threads/<riderId>/staff_<dispatcherId>`, with a summary row in each
 * side's inbox (`dispatcher_inbox/staff_<id>/<riderId>`,
 * `rider_inbox/<riderId>/staff_<id>`). The Firebase rules open a thread to its
 * rider and its dispatcher only (owners read everything).
 *
 * The mode is one value in the Realtime Database, `config/riderChatMode`, read
 * by this portal and by the rider app alike, so the switch happens for
 * everyone at once: a rider app from before threads only knows the shared
 * thread, and a dispatcher writing to threads before every rider has updated
 * would be writing to nobody. Missing or unreadable means "shared".
 */
export type RiderChatMode = "shared" | "threads";

export const staffUid = (dispatcherId: number | string) => `staff_${dispatcherId}`;

export function useRiderChatMode(): RiderChatMode {
  const [mode, setMode] = useState<RiderChatMode>("shared");
  useEffect(
    () =>
      onValue(
        ref(database, "config/riderChatMode"),
        (snapshot) => setMode(snapshot.val() === "threads" ? "threads" : "shared"),
        () => setMode("shared")
      ),
    []
  );
  return mode;
}

/** A conversation's summary row, as the inbox lists it. */
export interface RiderChatMeta {
  lastMessage?: string;
  lastSender?: "rider" | "dispatcher";
  senderName?: string;
  riderName?: string;
  dispatcherName?: string;
  updatedAt?: number;
}

/** What to listen to for this dispatcher's list of conversations, and how to read it. */
export function inboxSource(mode: RiderChatMode, dispatcherId: number | string) {
  if (mode === "threads") {
    return {
      path: `dispatcher_inbox/${staffUid(dispatcherId)}`,
      // { riderId: meta }
      read: (value: unknown) => (value && typeof value === "object" ? (value as Record<string, RiderChatMeta>) : {}),
    };
  }
  return {
    path: "rider_chats",
    // { riderId: { meta, messages, ... } }
    read: (value: unknown) => {
      const out: Record<string, RiderChatMeta> = {};
      if (value && typeof value === "object") {
        for (const [riderId, chat] of Object.entries<any>(value)) if (chat?.meta) out[riderId] = chat.meta;
      }
      return out;
    },
  };
}

export function messagesPath(mode: RiderChatMode, riderId: string, dispatcherId: number | string): string {
  return mode === "threads"
    ? `rider_threads/${riderId}/${staffUid(dispatcherId)}/messages`
    : `rider_chats/${riderId}/messages`;
}

/**
 * One message from this dispatcher to a rider, with every summary row it
 * touches, in one atomic write: a message must never land without its inbox
 * row, or the rider's list would not show it.
 */
export async function sendToRider(
  mode: RiderChatMode,
  {
    riderId,
    riderName,
    dispatcherId,
    dispatcherName,
    text,
  }: { riderId: string; riderName: string; dispatcherId: number | string; dispatcherName: string; text: string }
): Promise<void> {
  const now = Date.now();
  const message = { senderId: String(dispatcherId), senderName: dispatcherName, role: "dispatcher", text, timestamp: now };
  const path = messagesPath(mode, riderId, dispatcherId);
  const key = push(ref(database, path)).key;
  if (!key) throw new Error("Could not create a message id.");

  if (mode === "threads") {
    const meta: RiderChatMeta = { lastMessage: text, lastSender: "dispatcher", riderName, dispatcherName, updatedAt: now };
    await update(ref(database), {
      [`${path}/${key}`]: message,
      [`dispatcher_inbox/${staffUid(dispatcherId)}/${riderId}`]: meta,
      [`rider_inbox/${riderId}/${staffUid(dispatcherId)}`]: meta,
    });
    return;
  }

  await update(ref(database), {
    [`${path}/${key}`]: message,
    [`rider_chats/${riderId}/meta`]: { lastMessage: text, lastSender: "dispatcher", senderName: riderName, updatedAt: now },
    [`rider_chats/${riderId}/dispatcherMeta`]: { dispatcherId, dispatcherName },
  });
}
