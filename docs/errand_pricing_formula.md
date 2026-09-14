# Multi-Stop Errand Distance & Delivery Pricing Formula Specification

This document defines the mathematical formulation, algorithmic workflow, and configuration rules for computing delivery fees and grand totals for multi-stop errands in the Capstone Errand Delivery System (Tacurong City).

---

## 1. Variable Definitions

| Variable | Description | Live Value |
|---|---|---|
| $B$ | Base Delivery Fee | **₱70.00** |
| $R_{\text{base}}$ | Base Radius / Distance Allowance Threshold | **$2.0\text{ km}$** |
| $P_{\text{km}}$ | Rate added per kilometer beyond base allowance | **₱10.00 / km** |
| $P_{\text{store}}$ | Surcharge per store beyond the first | **₱30.00** |
| $n_{\max}$ | Additional stores the surcharge is capped at | **2** |
| $T_{\text{gate}}$ | Basket value below which NO handling fee applies | **₱1,000** |
| $U_{\text{gate}}$ | Item units above which a handling fee applies regardless of value | **20** |
| $T_{\text{hand}}$ | Basket value at or above which handling switches to a percentage | **₱1,001** |
| $F_{\text{flat}}$ | Flat handling fee below $T_{\text{hand}}$ | **₱50.00** |
| $r_{\text{hand}}$ | Percentage handling rate at or above $T_{\text{hand}}$ | **10%** |
| $T_{\text{ncod}}$ | Purchase value at or above which the non-cash surcharge applies | **₱3,000** |
| $F_{\text{ncod}}$ | Non-cash surcharge at or above $T_{\text{ncod}}$ (₱0 below) | **₱15.00** |
| $S_1, S_2, \dots, S_n$ | Ordered merchant/store waypoints | Locations in Service Area |
| $C$ | Customer Drop-off Destination | e.g. STI College Tacurong |
| $D_{\text{total}}$ | Cumulative sequential route distance | $\text{km}$ |
| $D_{\text{excess}}$ | Billable distance exceeding base allowance, rounded UP to the next whole km | $\lceil \max(0, D_{\text{total}} - R_{\text{base}}) \rceil$ |
| $F_{\text{dist}}$ | Distance Surcharge | $D_{\text{excess}} \times P_{\text{km}}$ |
| $F_{\text{store}}$ | Multi-Store Surcharge | $\min(n-1,\ n_{\max}) \times P_{\text{store}}$ |
| $F_{\text{hand}}$ | Purchase Handling Fee | see section 2.D |
| $F_{\text{delivery}}$ | Total Delivery Fee | $B + F_{\text{dist}} + F_{\text{store}} + F_{\text{hand}} + F_{\text{ncod}}$ |
| $I_{\text{subtotal}}$ | Estimated Items Purchase Subtotal (for Pabili) | ₱ |
| $G_{\text{total}}$ | Grand Total payable by Customer | $I_{\text{subtotal}} + F_{\text{delivery}} + \text{tip}$ |

> **Every value above is owner-editable in Owner -> Service Rates**, except
> $R_{\text{base}}$, $T_{\text{gate}}$ and $U_{\text{gate}}$. Those three are the SHAPE
> of the formula rather than prices — changing where the distance fee starts
> changes what the base fee *means* — so they are code constants published to
> clients via `rateConfigService.PRICING_RULES`, and no surface keeps its own copy.

### Distance replaced barangay zones

The fare was originally specified as ₱70 for Barangay Poblacion plus ₱10 per
zone, with zones assigned per barangay by the owner and managerial dispatcher.
**That rule was retired in favour of routed road distance**: ₱70 covers the first
2.0 km, then ₱10 per started kilometre.

There is deliberately no `Zone` model, no barangay-to-zone table and no zone
administration screen. Distance is measured on the real road network the customer
can watch on their own map, which is harder to dispute and self-maintaining as
the city grows — a new subdivision needs no zone assignment.
`VerifiedPlace.barangay` exists, but it is an address and search field and carries
no pricing authority.

---

## 2. Mathematical Formulation

### A. Cumulative Multi-Stop Route Distance ($D_{\text{total}}$)
For an errand with $n$ merchant/store stops ($S_1, S_2, \dots, S_n$) and final customer drop-off destination $C$:
$$D_{\text{total}} = \sum_{k=1}^{n-1} \text{Distance}(S_k, S_{k+1}) + \text{Distance}(S_n, C)$$

- **Single-Stop Errand ($n=1$)**: $D_{\text{total}} = \text{Distance}(S_1, C)$
- **Multi-Stop Errand ($n \ge 2$)**: Sum of distances between successive stops plus distance from last stop to customer drop-off.

### B. Excess Distance Calculation ($D_{\text{excess}}$)
$$D_{\text{excess}} = \left\lceil \max(0, D_{\text{total}} - R_{\text{base}}) \right\rceil$$

- If $D_{\text{total}} \le R_{\text{base}}$ (e.g. $\le 2.0\text{ km}$), $D_{\text{excess}} = 0\text{ km}$.
- If $D_{\text{total}} > R_{\text{base}}$, distance is billed in whole started kilometres: any fraction of a kilometre beyond the allowance is rounded UP and charged as a full km. A route of $2.1\text{ km}$ and a route of $2.9\text{ km}$ both bill exactly $1\text{ km}$ of excess; a route of $3.0\text{ km}$ still bills $1\text{ km}$, and $3.1\text{ km}$ bills $2\text{ km}$.

### C. Distance Surcharge ($F_{\text{dist}}$)
$$F_{\text{dist}} = D_{\text{excess}} \times P_{\text{km}}$$

### D. Purchase Handling Fee ($F_{\text{hand}}$)

Charged on what the rider shops for, not on the trip. Two gates, in order.

**1. Does it qualify at all?** Nothing is charged below both gates:

$$\text{qualifies} \iff \left(I_{\text{subtotal}} \ge T_{\text{gate}}\right) \lor \left(\text{units} > U_{\text{gate}}\right)$$

The unit gate exists so a twenty-five-item basket of cheap goods — real shopping
work, low value — is not exempt merely for being inexpensive.

**2. Which category?** Each merchant category carries a mode, set by the owner in
Merchants -> category card. Live configuration:

| Category | Mode | Effect |
|---|---|---|
| Supermarket & Grocery | `THRESHOLD` | ₱50 flat, or 10% at ₱1,001+ |
| Retail & General Merchandise | `NONE` | no handling fee |
| Bakery | `NONE` | no handling fee |
| Fast Food & Restaurant | `NONE` | no handling fee |
| Pharmacy & Health | `NONE` | no handling fee |

`NONE` is honoured literally. An earlier build silently re-priced every `NONE`
category as `THRESHOLD` once the basket cleared $T_{\text{gate}}$, which made
"groceries only" impossible to express.

On a mixed basket the **highest** applicable mode wins, so a grocery run with a
fast-food stop still pays the grocery rate.

**3. The amount.** For `THRESHOLD`:

$$F_{\text{hand}} = \begin{cases} F_{\text{flat}} & I_{\text{subtotal}} < T_{\text{hand}} \ \min\left(I_{\text{subtotal}} \times r_{\text{hand}},\ F_{\text{flat}} + \left(I_{\text{subtotal}} - T_{\text{hand}} + 1\right)\right) & I_{\text{subtotal}} \ge T_{\text{hand}} \end{cases}$$

The second branch is **marginal relief**, and it exists because the raw tier has
a cliff: a ₱1,000 basket pays ₱50, and one peso more would jump to ₱100.10 —
₱50.10 of extra fee for ₱1 of extra shopping. Relief caps the fee at the flat
amount plus the amount the basket grew by, so crossing the line never costs more
than the peso that crossed it. The cap stops binding around ₱1,056, above which
the plain percentage is the lower figure and applies normally.

| Basket | Raw 10% | Charged |
|---|---|---|
| ₱1,000 | — | **₱50.00** (flat) |
| ₱1,001 | ₱100.10 | **₱51.00** (relieved) |
| ₱1,050 | ₱105.00 | **₱100.00** (relieved) |
| ₱1,056 | ₱105.60 | **₱105.60** (percentage) |
| ₱2,000 | ₱200.00 | **₱200.00** (percentage) |

**4. The agreed ceiling.** When a customer confirms their itemised breakdown, the
basket and handling fee they agreed to are stamped onto the errand
(`quotedHandlingBasket`, `quotedHandlingFee`). The handling fee is never billed
above that figure afterwards.

This matters because `markItemsPurchased` overwrites `estimatedCost` with the
REAL receipt total — *after* the rider has already paid for the goods, when there
is no moment left in which to ask for consent. Without the ceiling a ₱1,000
estimate ringing up at ₱1,200 moved the fee from ₱50 to ₱120 with nobody
deciding it. The ceiling is a one-way ratchet: a smaller real basket still lowers
the fee.

A receipt exceeding the agreed basket by more than **₱20** escalates instead: the
errand is held, the dispatcher arranges the difference with the customer, and the
ceiling only moves once the customer has consented and paid a top-up. See
section 5.

Every decision is recorded on the errand as `handlingFeeDecision` — mode, tier,
basket, evidence, what the rule alone produced, the relief cap, the ceiling, and
which one won.

### E. Non-Cash Payment Surcharge ($F_{\text{ncod}}$)

$$F_{\text{ncod}} = \begin{cases} 15.00 & I_{\text{subtotal}} \ge T_{\text{ncod}} \ 0.00 & \text{otherwise} \end{cases}$$

Applies only once a confirmed payment mode is not Cash on Delivery. These two
amounts were inverted in the live configuration for some time (₱50 at or above
the threshold, ₱15 below) — over-charging every large purchase and charging every
small one a fee it never owed. `rateConfigValidators` now refuses a save where the
at-or-above fee is the smaller of the two.

### F. Total Delivery Fee ($F_{\text{delivery}}$)

$$F_{\text{delivery}} = \operatorname{round}\left(B + F_{\text{dist}} + F_{\text{store}} + F_{\text{hand}} + F_{\text{ncod}}\right)$$

Rounded to whole pesos **once, over the sum** — never per component. Rounding the
parts and adding them can land a peso away from rounding the total.

### G. Grand Total ($G_{\text{total}}$)

$$G_{\text{total}} = I_{\text{subtotal}} + F_{\text{delivery}} + \text{tip}$$

$I_{\text{subtotal}}$ is the customer's money for the goods, fronted by the
company and carried by the rider. It is not revenue, it earns no commission, and
no surface may fold it into a fee.

---

## 3. Concrete Example (Tacurong City)

### Scenario

- **Stop 1 ($S_1$)**: Mang Inasal (National Highway, Tacurong) — Fast Food
- **Stop 2 ($S_2$)**: Save More Supermarket — Supermarket & Grocery
- **Customer Destination ($C$)**: STI College Tacurong (Alunan Highway)
- **Items Subtotal ($I_{\text{subtotal}}$)**: ₱1,050.00 across both stops
- **Item units**: 12
- **Payment**: Cash on Delivery

### Step by step

1. **Segment 1**: Mang Inasal to Save More = **$0.8\text{ km}$**
2. **Segment 2**: Save More to STI College Tacurong = **$2.7\text{ km}$**
3. **Total route distance**: $D_{\text{total}} = 0.8 + 2.7 = \mathbf{3.5\text{ km}}$
4. **Base allowance**: the first **$2.0\text{ km}$** is covered by the flat **₱70.00** base fee.
5. **Excess distance**: $D_{\text{excess}} = \lceil \max(0,\ 3.5 - 2.0) \rceil = \lceil 1.5 \rceil = \mathbf{2\text{ km}}$
6. **Distance surcharge**: $F_{\text{dist}} = 2 \times 10 = \mathbf{₱20.00}$
7. **Multi-store surcharge**: two stops, so one store beyond the first — $F_{\text{store}} = 1 \times 30 = \mathbf{₱30.00}$
8. **Handling fee**: ₱1,050 clears the ₱1,000 gate. The basket touches Supermarket & Grocery (`THRESHOLD`) and Fast Food (`NONE`); the higher mode wins. ₱1,050 is at or above ₱1,001, so the percentage tier applies — but marginal relief caps it:
   $$F_{\text{hand}} = \min(1050 \times 0.10,\ 50 + (1050 - 1001 + 1)) = \min(105,\ 100) = \mathbf{₱100.00}$$
9. **Non-cash surcharge**: COD, so $F_{\text{ncod}} = \mathbf{₱0.00}$
10. **Delivery fee**: $F_{\text{delivery}} = \operatorname{round}(70 + 20 + 30 + 100 + 0) = \mathbf{₱220.00}$
11. **Grand total**: $G_{\text{total}} = 1050 + 220 = \mathbf{₱1{,}270.00}$

The customer pays ₱1,270.00: **₱1,050.00 of goods** the company fronts, and
**₱220.00 of service fees**, which is the only part revenue and rider commission
are ever taken from.

---

## 4. Implementation Invariants

1. **Road Network Distance** — *implemented*. `errandService.recalculateFee` calls `services/routingService.routeDistanceKm`, which routes through `lib/routing/`: self-hosted **OSRM** first, **Google Directions** if OSRM is unreachable, and only then a detour-scaled Haversine estimate.

   Until this was built the server priced on a straight-line Haversine sum while the customer's map displayed the real road route from a different code path — so the fare was computed from a distance shorter than the route they could watch on their own screen. Measured on real Tacurong pairs, road distance runs **~1.48x** straight-line, so the gap was material, not cosmetic.

   **Fallback behaviour**: when no routing engine is reachable, distance is `haversine x ROAD_DETOUR_FACTOR` at `FALLBACK_AVG_SPEED_KMH`. Both constants are measured against the live road network by `server/gis/calibrate.ts`, not guessed, and re-measured after any OSM data refresh. Any result produced this way is flagged `degraded` and any ETA built on it is widened.
2. **Deterministic Rounding** — *implemented*. Excess distance is rounded UP (ceiling) to the next whole kilometre before multiplying by $P_{\text{km}}$ — see `pricingStrategy.ts`'s `excessKm`. A partial kilometre still costs the rider the fuel and time of a full one, so it is billed as one. The resulting distance surcharge is therefore always an exact multiple of $P_{\text{km}}$; only the OTHER fee components (the purchase handling fee's percentage tier) can still carry centavos, which is why the delivery fee is rounded to the nearest whole peso only once, over the sum of all five components — see `StandardPricingStrategy.calculate`'s final `Math.round`.
3. **3NF Database Storage** — *implemented*. `errands` now stores `deliveryFee`, `totalCost`, and `distanceKm`, plus `routeDistanceMeters`, `routeDurationSeconds`, `routeGeometry` (encoded polyline), `routeProvider`, and `routedAt`. Distance was previously computed inside `recalculateFee` and discarded, leaving no record of why a customer was charged what they were charged.

---

## 5. Payment Plans and the Goods-Release Gate

Three ways an errand's money moves. All three are recorded; only one puts cash in
a rider's hands for the full bill.

| Mode | Owed before dispatch | Rider collects at door | Ledger |
|---|---|---|---|
| Cash on Delivery | nothing | the whole bill | `SettlementRecord` |
| Non-COD — 50% Downpayment | half the **goods** | the balance | `ErrandPayment` |
| GCash / PayMaya, Bank Transfer, Debit/Credit Card | the **whole bill** | nothing | `ErrandPayment` |

The downpayment is half of $I_{\text{subtotal}}$ — the goods — not half the grand
total. Delivery and service fees fall due with the balance.

### Money arrives outside this system

There is no payment gateway. A customer pays through the company's Facebook Page
and a **dispatcher attests** that it arrived, from Stage 4 of the order chat.
Every `ErrandPayment` row therefore records `confirmedByUserId`: an attestation
nobody signed is a figure with no one accountable for it. The foreign key is
`ON DELETE RESTRICT` — a staff account cannot be removed while it still vouches
for money.

The ledger is append-only. A payment recorded in error is corrected with a
`REFUND` row, which is also what happens to the actual money.

Kinds: `UPFRONT` (before dispatch), `TOP_UP` (an overage the customer agreed to),
`FINAL` (the balance, at the door), `REFUND`.

### The gate

Two conditions hold the goods, enforced server-side in
`errandService.updateStatus` at the `IN_TRANSIT -> DELIVERED` transition — the
moment the items leave the rider's hands and the company's exposure becomes
unrecoverable:

1. **No up-front payment recorded.** Nothing has arrived for an errand that owed
   something before dispatch.
2. **An unapproved receipt overage.** The receipt beat `quotedHandlingBasket` by
   more than ₱20 and nobody has arranged the difference.

The rider apps carry their own copy of both rules (`errandGate.ts`) so a rider
sees a reason at the door rather than a bare 409 — but the server is what
decides. Both reasons are phrased as a wait, never as a task: the rider cannot
confirm a customer's payment, and telling them to "collect the downpayment" would
send them to argue about money that was never theirs to take.

### What this does to reporting

- **Rider commission is unaffected.** It is `deliveryFee x 0.7 + tip`, taken on
  fees only, and a rider who did the job is owed their share regardless of what
  the customer still owes.
- **Settlement expects the balance, not the bill.** On the downpayment plan the
  money already paid never passed through the rider; expecting the full
  `totalCost` would record every such errand as SHORT by exactly the downpayment
  and make honest riders read as chronic short-collectors.
- **Gross revenue is split.** `getSettlementReport` reports `collectedRevenue`
  (a rider reconciled it, or a ledger row confirms it) apart from
  `awaitingCollection` (finished work whose money is unaccounted for).
- **Two exception kinds** cover the failures: `OVERAGE_PENDING` (goods held right
  now) and `UNPAID_BALANCE` (delivered, money never came).
