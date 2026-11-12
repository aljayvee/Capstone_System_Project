/**
 * The cards the customer should only ever have one of: the order summary
 * (`order_confirmation`), the payment question (`payment_prompt`) and the
 * store locations (`pinpoints`). 2026-10-10.
 *
 * Every re-send used to add another card, so the customer scrolled past old
 * lists and could still approve one. Now a re-send updates the card where it
 * stands, or, when it is buried, posts it again at the bottom and deletes
 * every older copy.
 *
 * Pure: this decides, useOrderChat.postCard writes. Kept apart so the rule can
 * be run without Firebase.
 */

/**
 * How many messages may follow a card before the customer has to scroll up to
 * find it. Past this the card is posted again at the bottom; within it, the
 * card is updated where it stands.
 *
 * Counted, not measured: the dispatcher's screen cannot see the customer's.
 * Four is about what a phone shows below an order summary, a tall card, before
 * it scrolls off. The payment card that follows the list is one of the four,
 * so a list is never "buried" by its own payment question.
 */
export const CARD_BURIED_AFTER = 4;

/** How a card is placed. */
export interface PostCardOptions {
  /** The push notification when the card is updated in place (no new message). */
  updatedNotice: string;
  /** Post at the bottom even when the card is still in view. */
  repost?: boolean;
  /**
   * Card types that belong directly below this one. When this card moves to
   * the bottom they move with it, silently, in the same order, so the payment
   * question never ends up above the list it asks about.
   */
  followers?: string[];
  /** A card type this one must sit below. Above the latest of it counts as buried. */
  follows?: string;
}

/** A chat message as the feed delivers it: sorted oldest first. */
export interface FeedMessage {
  id: string;
  type?: string;
  timestamp: number;
  [key: string]: any;
}

export interface CardPlan {
  /** True: post a new card at the bottom. False: update `updateId` in place. */
  moved: boolean;
  updateId: string | null;
  /** Copies of this card to delete once the kept or new one is written. */
  deleteIds: string[];
  /** Cards re-posted below a moved card, in order, each with the copies it replaces. */
  followers: Array<{ content: Record<string, any>; deleteIds: string[] }>;
}

/** Decides where a card of `type` goes in `feed`. */
export function planCard(feed: FeedMessage[], type: string, opts: PostCardOptions): CardPlan {
  const ofType = (t: string) => feed.filter((m) => m.type === t);
  const copies = ofType(type);
  const latest = copies.length > 0 ? copies[copies.length - 1] : null;
  const leaders = opts.follows ? ofType(opts.follows) : [];
  const leader = leaders.length > 0 ? leaders[leaders.length - 1] : null;

  const moved =
    !latest ||
    Boolean(opts.repost) ||
    feed.length - 1 - feed.indexOf(latest) > CARD_BURIED_AFTER ||
    Boolean(leader && leader.timestamp > latest.timestamp);

  if (!moved && latest) {
    return {
      moved: false,
      updateId: latest.id,
      deleteIds: copies.filter((m) => m.id !== latest.id).map((m) => m.id),
      followers: [],
    };
  }

  const followers = (opts.followers ?? []).flatMap((t) => {
    const followerCopies = ofType(t);
    const follower = followerCopies[followerCopies.length - 1];
    if (!follower) return [];
    // Moved, not re-asked: its own timestamp and edit time are left behind.
    const { id: _id, timestamp: _ts, updatedAt: _up, ...content } = follower;
    return [{ content, deleteIds: followerCopies.map((m) => m.id) }];
  });

  return { moved: true, updateId: null, deleteIds: copies.map((m) => m.id), followers };
}
