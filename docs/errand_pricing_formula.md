# Multi-Stop Errand Distance & Delivery Pricing Formula Specification

This document defines the mathematical formulation, algorithmic workflow, and configuration rules for computing delivery fees and grand totals for multi-stop errands in the Capstone Errand Delivery System (Tacurong City).

---

## 1. Variable Definitions

| Variable | Description | Default / Example Value |
|---|---|---|
| $B$ | Base Delivery Fee | **₱50.00** |
| $R_{\text{base}}$ | Base Radius / Distance Allowance Threshold | **$2.0\text{ km}$** |
| $P_{\text{km}}$ | Rate added per kilometer beyond base allowance | **₱10.00 / km** |
| $S_1, S_2, \dots, S_n$ | Ordered merchant/store waypoints | Locations in Service Area |
| $C$ | Customer Drop-off Destination | e.g. STI College Tacurong |
| $D_{\text{total}}$ | Cumulative sequential route distance | $\text{km}$ |
| $D_{\text{excess}}$ | Billable distance exceeding base allowance | $\max(0, D_{\text{total}} - R_{\text{base}})$ |
| $F_{\text{dist}}$ | Distance Surcharge | $D_{\text{excess}} \times P_{\text{km}}$ |
| $F_{\text{delivery}}$ | Total Delivery Fee | $B + F_{\text{dist}}$ |
| $I_{\text{subtotal}}$ | Estimated Items Purchase Subtotal (for Pabili) | ₱ |
| $G_{\text{total}}$ | Grand Total payable by Customer | $I_{\text{subtotal}} + F_{\text{delivery}}$ |

---

## 2. Mathematical Formulation

### A. Cumulative Multi-Stop Route Distance ($D_{\text{total}}$)
For an errand with $n$ merchant/store stops ($S_1, S_2, \dots, S_n$) and final customer drop-off destination $C$:
$$D_{\text{total}} = \sum_{k=1}^{n-1} \text{Distance}(S_k, S_{k+1}) + \text{Distance}(S_n, C)$$

- **Single-Stop Errand ($n=1$)**: $D_{\text{total}} = \text{Distance}(S_1, C)$
- **Multi-Stop Errand ($n \ge 2$)**: Sum of distances between successive stops plus distance from last stop to customer drop-off.

### B. Excess Distance Calculation ($D_{\text{excess}}$)
$$D_{\text{excess}} = \max(0, D_{\text{total}} - R_{\text{base}})$$

- If $D_{\text{total}} \le R_{\text{base}}$ (e.g. $\le 2.0\text{ km}$), $D_{\text{excess}} = 0\text{ km}$.
- If $D_{\text{total}} > R_{\text{base}}$, only the portion beyond $2.0\text{ km}$ is charged.

### C. Distance Surcharge ($F_{\text{dist}}$)
$$F_{\text{dist}} = D_{\text{excess}} \times P_{\text{km}}$$

### D. Total Delivery Fee ($F_{\text{delivery}}$)
$$F_{\text{delivery}} = B + F_{\text{dist}}$$

### E. Grand Total ($G_{\text{total}}$)
$$G_{\text{total}} = I_{\text{subtotal}} + F_{\text{delivery}}$$

---

## 3. Concrete Example (Tacurong City)

### Scenario:
- **Stop 1 ($S_1$)**: Mang Inasal (National Highway, Tacurong)
- **Stop 2 ($S_2$)**: Shangshang Marketing
- **Customer Destination ($C$)**: STI College Tacurong (Alunan Highway)
- **Items Subtotal ($I_{\text{subtotal}}$)**: ₱350.00

### Step-by-Step Calculation:
1. **Segment 1**: Mang Inasal $\longrightarrow$ Shangshang Marketing = **$0.8\text{ km}$**
2. **Segment 2**: Shangshang Marketing $\longrightarrow$ STI College Tacurong = **$2.7\text{ km}$**
3. **Total Route Distance ($D_{\text{total}}$)**: 
   $$D_{\text{total}} = 0.8\text{ km} + 2.7\text{ km} = \mathbf{3.5\text{ km}}$$
4. **Base Allowance ($R_{\text{base}}$)**: First **$2.0\text{ km}$** covered by flat **₱50.00** base fee.
5. **Excess Distance ($D_{\text{excess}}$)**: 
   $$D_{\text{excess}} = \max(0, 3.5\text{ km} - 2.0\text{ km}) = \mathbf{1.5\text{ km}}$$
6. **Distance Surcharge ($F_{\text{dist}}$)**: 
   $$F_{\text{dist}} = 1.5\text{ km} \times \text{₱10.00/km} = \mathbf{₱15.00}$$
7. **Total Delivery Fee ($F_{\text{delivery}}$)**: 
   $$F_{\text{delivery}} = \text{₱50.00} + \text{₱15.00} = \mathbf{₱65.00}$$
8. **Grand Total ($G_{\text{total}}$)**: 
   $$G_{\text{total}} = \text{₱350.00} + \text{₱65.00} = \mathbf{₱415.00}$$

---

## 4. Implementation Invariants

1. **Road Network Distance** — *implemented*. `errandService.recalculateFee` calls `services/routingService.routeDistanceKm`, which routes through `lib/routing/`: self-hosted **OSRM** first, **Google Directions** if OSRM is unreachable, and only then a detour-scaled Haversine estimate.

   Until this was built the server priced on a straight-line Haversine sum while the customer's map displayed the real road route from a different code path — so the fare was computed from a distance shorter than the route they could watch on their own screen. Measured on real Tacurong pairs, road distance runs **~1.48x** straight-line, so the gap was material, not cosmetic.

   **Fallback behaviour**: when no routing engine is reachable, distance is `haversine x ROAD_DETOUR_FACTOR` at `FALLBACK_AVG_SPEED_KMH`. Both constants are measured against the live road network by `server/gis/calibrate.ts`, not guessed, and re-measured after any OSM data refresh. Any result produced this way is flagged `degraded` and any ETA built on it is widened.
2. **Deterministic Rounding**: Excess distance may be rounded to 1 decimal place or computed as continuous floating-point before multiplying by $P_{\text{km}}$.
3. **3NF Database Storage** — *implemented*. `errands` now stores `deliveryFee`, `totalCost`, and `distanceKm`, plus `routeDistanceMeters`, `routeDurationSeconds`, `routeGeometry` (encoded polyline), `routeProvider`, and `routedAt`. Distance was previously computed inside `recalculateFee` and discarded, leaving no record of why a customer was charged what they were charged.
