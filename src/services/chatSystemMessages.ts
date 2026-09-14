import { push, ref } from 'firebase/database';
import { database } from "../firebase/config";

/**
 * Automated messages that narrate an errand's progress inside its chat.
 *
 * The chat used to begin empty and stay silent until a human typed. Everything
 * that actually happened to the request — submitted, picked up for review,
 * accepted, declined — occurred somewhere else, so the customer watched a
 * spinner while the conversation that was supposedly about their errand
 * contained no mention of it.
 *
 * These messages make the chat the record. A customer scrolling back can see
 * what they asked for, when someone looked at it, who took it on, and why it
 * ended if it did — without having to have been watching at the time.
 *
 * Written from the client rather than the server because this project keeps
 * chat entirely in Firebase RTDB and the server has no Firebase SDK; every
 * existing message is written by whichever client performed the action, and
 * these follow the same rule. The durable record of a decline lives in
 * `errand_decline_reasons` on the server regardless, so a failed chat write
 * loses the announcement, never the fact.
 */

/** Distinguishes automated messages from anything a person typed. */
export type SystemMessageKind =
  | 'order_submitted'
  | 'under_review'
  | 'accepted'
  | 'declined'
  | 'item_revision';

export interface OrderSummaryItem {
  storeCategory: string;
  itemName: string;
  quantity: number;
}

interface SystemMessageBase {
  senderId: 'system';
  senderName: 'Sugo';
  role: 'system';
  type: 'system';
  systemKind: SystemMessageKind;
  text: string;
  timestamp: number;
}

async function postSystemMessage(
  errandId: string,
  message: Omit<SystemMessageBase, 'senderId' | 'senderName' | 'role' | 'type' | 'timestamp'> &
    Record<string, unknown>
): Promise<void> {
  try {
    await push(ref(database, `chats/${errandId}/messages`), {
      senderId: 'system',
      senderName: 'Sugo',
      role: 'system',
      type: 'system',
      timestamp: Date.now(),
      ...message,
    });
  } catch (err) {
    // Never surfaced to the customer and never rethrown. These messages narrate
    // an action that has already succeeded on the server; failing the action
    // because its announcement could not be written would be strictly worse
    // than a chat that is missing one line.
    console.warn(`[chatSystemMessages] Could not post ${message.systemKind}:`, err);
  }
}

/**
 * The structured order, posted the moment the customer sends it.
 *
 * Carries the items as data as well as text so the chat can render a proper
 * receipt card, and so the dispatcher opening the conversation sees exactly
 * what was requested without switching to another panel. The text is written to
 * stand alone, because any client that does not know the `system` type still
 * renders `text` and must remain readable.
 */
export function postOrderSubmitted(
  errandId: string,
  params: {
    items: OrderSummaryItem[];
    deliveryAddress: string;
    categories: string[];
    deliveryFee: number;
  }
): Promise<void> {
  const { items, deliveryAddress, categories, deliveryFee } = params;
  const totalUnits = items.reduce((sum, i) => sum + i.quantity, 0);

  const lines = items.map((i) => `• ${i.quantity} × ${i.itemName}  (${i.storeCategory})`);
  const text = [
    'ERRAND REQUEST',
    '',
    `Stores: ${categories.join(', ') || 'Pabili'}`,
    `Deliver to: ${deliveryAddress}`,
    '',
    `Items (${totalUnits}):`,
    ...lines,
    '',
    `Delivery fee so far: ₱${Number(deliveryFee || 0).toFixed(2)}`,
    'Waiting for a dispatcher to review this request.',
  ].join('\n');

  return postSystemMessage(errandId, {
    systemKind: 'order_submitted',
    text,
    order: { items, deliveryAddress, categories, deliveryFee, totalUnits },
  });
}

/** Posted when a dispatcher opens the request to look at it. */
export function postUnderReview(errandId: string, dispatcherName?: string): Promise<void> {
  return postSystemMessage(errandId, {
    systemKind: 'under_review',
    text: dispatcherName
      ? `${dispatcherName} is reviewing your request now — checking the stores and working out the fee.`
      : 'A dispatcher is reviewing your request now — checking the stores and working out the fee.',
    dispatcherName: dispatcherName || null,
  });
}

/** Posted when a dispatcher accepts. Written in the dispatcher's own voice,
 *  because from here on the customer is talking to a person, not a system. */
export function postAccepted(errandId: string, dispatcherName: string): Promise<void> {
  return postSystemMessage(errandId, {
    systemKind: 'accepted',
    text:
      `Hi! I'm ${dispatcherName}, your dispatcher. I've reviewed your order and it's good to go. ` +
      `I'll confirm what's available at the store and the final total before anything is bought, ` +
      `then assign a rider. Message me here if you need to change anything.`,
    dispatcherName,
  });
}

/** Posted when a dispatcher declines, carrying the reason. */
export function postDeclined(
  errandId: string,
  reason: string,
  dispatcherName?: string
): Promise<void> {
  return postSystemMessage(errandId, {
    systemKind: 'declined',
    text:
      `This errand was cancelled by ${dispatcherName || 'the dispatcher'}.\n\n` +
      `Reason: ${reason}\n\n` +
      `Nothing has been charged. You can place a new errand any time.`,
    reason,
    dispatcherName: dispatcherName || null,
  });
}

/** One line of a proposed revision, as the customer will read it. */
export interface RevisedItem {
  itemName: string;
  storeCategory?: string;
  /** Quantity being proposed. 0 means the dispatcher wants to drop the line. */
  quantity: number;
  /**
   * What the customer originally asked for, carried so the card can show the
   * change rather than just the outcome.
   *
   * Without it a revision reads as a plain list: a customer looking at
   * "Burger Meal x2" under a heading demanding their approval has no way to see
   * that they ordered one. Approving something you cannot tell has changed is
   * not consent.
   */
  previousQuantity?: number;
  /** False when the shop does not have it — the reason most revisions exist. */
  available: boolean;
  /** What the dispatcher found, in their own words. */
  note?: string;
}

export type ItemRevisionStatus = 'pending' | 'approved' | 'rejected';

/**
 * The dispatcher's proposed changes to the basket, put to the customer.
 *
 * Sent during review, before the order is accepted, whenever verifying items
 * turns up something the customer did not ask for: a product the shop is out of,
 * a quantity that has to change, a line that cannot be bought at all. The
 * customer approves or rejects it in their own chat, and the dispatcher cannot
 * accept the order while one is outstanding.
 *
 * A REPLACEMENT for guessing. Substituting quietly and letting the customer
 * discover it from the receipt is how a delivery arrives with the wrong thing in
 * the bag and nobody able to say who decided that.
 *
 * `revisionId` rather than relying on the message key: the customer's approve
 * and the dispatcher's gate have to be talking about the same proposal, and a
 * second revision sent while the first is still on screen must not be answerable
 * by tapping the older card.
 */
export function postItemRevision(
  errandId: string,
  params: {
    revisionId: string;
    items: RevisedItem[];
    dispatcherName?: string;
    /** Free-text context the dispatcher adds, e.g. what the shop offered instead. */
    note?: string;
  }
): Promise<void> {
  const { revisionId, items, dispatcherName, note } = params;

  const unavailable = items.filter((i) => !i.available || i.quantity === 0);
  const keeping = items.filter((i) => i.available && i.quantity > 0);

  const lines: string[] = ['ITEM CHECK', ''];
  if (unavailable.length > 0) {
    lines.push('Not available:');
    lines.push(...unavailable.map((i) => `• ${i.itemName}${i.note ? ` — ${i.note}` : ''}`));
    lines.push('');
  }
  if (keeping.length > 0) {
    lines.push('Still going ahead:');
    lines.push(
      ...keeping.map((i) => {
        const changed = i.previousQuantity !== undefined && i.previousQuantity !== i.quantity;
        return changed
          ? `• ${i.itemName} — ${i.previousQuantity} changed to ${i.quantity}`
          : `• ${i.quantity} × ${i.itemName}`;
      })
    );
    lines.push('');
  }
  if (note) {
    lines.push(note, '');
  }
  lines.push('Approve this and I will carry on, or reject it and tell me what you would prefer.');

  return postSystemMessage(errandId, {
    systemKind: 'item_revision',
    text: lines.join('\n'),
    revisionId,
    revision: { items },
    // Updated in place when the customer answers, the same way the existing
    // order_confirmation card carries `confirmed`.
    status: 'pending' satisfies ItemRevisionStatus,
    dispatcherName: dispatcherName || null,
  });
}
