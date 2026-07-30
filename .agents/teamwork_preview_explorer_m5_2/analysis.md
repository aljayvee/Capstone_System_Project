# Form State Logic Analysis Report

## Executive Summary

This document provides a technical analysis of form state logic defects identified in `c:\Capstone_Project_Web\CustomerApp\src\screens\OrderFormScreen.tsx`. 

Three major state management and input validation findings were analyzed:
1. **Missing Receiver Address Validation in Padala Form**: `validateAndSubmit` validates `padalaItem` and `padalaReceiverPhone` but omits checking `padalaReceiver`, allowing orders to proceed with blank receiver details.
2. **Stale Category Items Retention on Unselection**: Unselecting a Pabili store category in `toggleCategory` removes the category name from `selectedCats` but leaves its associated items in `catItems` state, leading to lingering data in `orderPayload`.
3. **Preservation of Empty Item Strings in Payload**: Adding item inputs via `+ Add Another Item` and leaving them blank or with whitespace preserves empty strings (`""`) in `orderPayload.catItems` because sanitization is not performed prior to payload dispatch.

Exact code modifications, state cleanup logic, sanitization pipelines, and test implications are detailed below.

---

## 1. Finding Analysis & Evidence Chains

### Finding 1: Missing Padala Receiver Address Validation
- **Location**: `src/screens/OrderFormScreen.tsx`, lines 37–40 & lines 117–126.
- **Evidence**:
  - `OrderFormScreen` initializes state `const [padalaReceiver, setPadalaReceiver] = useState('');` (line 39).
  - Renders input element with `testID="padala-receiver-input"` and label `"Receiver Name & Address"` (lines 277–284).
  - Validation block in `validateAndSubmit` (lines 117–126):
    ```typescript
    if (isPadala) {
      if (!padalaItem.trim()) {
        setValidationError('Please enter parcel/item description for Padala.');
        return;
      }
      if (!padalaReceiverPhone.trim()) {
        setValidationError('Please enter receiver phone number for Padala.');
        return;
      }
    }
    ```
  - **Root Cause**: `validateAndSubmit` fails to verify `!padalaReceiver.trim()`. A user can enter item description and phone number while leaving receiver address completely empty, causing `padalaInfo.receiver` to submit as `""`.

### Finding 2: Stale State Retention upon Category Unselection
- **Location**: `src/screens/OrderFormScreen.tsx`, lines 50–66 & line 147.
- **Evidence**:
  - `toggleCategory` implementation (lines 50–66):
    ```typescript
    const toggleCategory = (catName: string) => {
      setPabiliError(null);
      if (selectedCats.includes(catName)) {
        setSelectedCats(selectedCats.filter((c) => c !== catName));
      } else { ... }
    };
    ```
  - When a category is deselected, `selectedCats` is updated, but `catItems` retains the key `[catName]: [...]`.
  - When constructing `OrderPayload` (line 147):
    ```typescript
    catItems: isPabili ? catItems : undefined,
    ```
  - **Root Cause**: Deselecting a category does not purge `catItems[catName]`. Consequently, `orderPayload.catItems` sends items for categories the user turned off.

### Finding 3: Preservation of Empty String Inputs in Order Payload
- **Location**: `src/screens/OrderFormScreen.tsx`, lines 107–114 & line 147.
- **Evidence**:
  - When adding items in Pabili, `handleAddItem` appends `""` to `catItems[catName]` (lines 68–74).
  - `validateAndSubmit` checks:
    ```typescript
    const items = catItems[cat] || [];
    const nonArrayOrEmpty = items.filter((i) => i.trim().length > 0);
    if (nonArrayOrEmpty.length === 0) { ... }
    ```
  - Validation passes as long as *at least one item* has non-empty text (e.g. `["Milk", ""]`).
  - When creating `OrderPayload`, `catItems` (containing `["Milk", ""]`) is assigned directly without trimming or filtering empty strings.
  - **Root Cause**: Lack of input sanitization step prior to dispatching `OrderPayload`.

---

## 2. Formulation of Exact Solutions

### Solution for Finding 1 (Padala Receiver Validation)
Add a validation check for `padalaReceiver` in `validateAndSubmit`:
```typescript
if (isPadala) {
  if (!padalaItem.trim()) {
    setValidationError('Please enter parcel/item description for Padala.');
    return;
  }
  if (!padalaReceiver.trim()) {
    setValidationError('Please enter receiver name and address for Padala.');
    return;
  }
  if (!padalaReceiverPhone.trim()) {
    setValidationError('Please enter receiver phone number for Padala.');
    return;
  }
}
```

### Solution for Finding 2 (Category Unselection Cleanup)
Update `toggleCategory` to delete the category key from `catItems` when deselected:
```typescript
const toggleCategory = (catName: string) => {
  setPabiliError(null);
  if (selectedCats.includes(catName)) {
    setSelectedCats(selectedCats.filter((c) => c !== catName));
    setCatItems((prev) => {
      const updated = { ...prev };
      delete updated[catName];
      return updated;
    });
  } else {
    if (selectedCats.length >= 3) {
      const msg = 'You can select up to 3 categories only.';
      setPabiliError(msg);
      Alert.alert('Category Limit', msg);
      return;
    }
    setSelectedCats([...selectedCats, catName]);
    if (!catItems[catName]) {
      setCatItems({ ...catItems, [catName]: [''] });
    }
  }
};
```

### Solution for Finding 3 (Empty Item Filtering & Payload Sanitization)
In `validateAndSubmit`, construct a sanitized `sanitizedCatItems` map for active categories only, trimming whitespace and filtering out empty strings:
```typescript
let sanitizedCatItems: Record<string, string[]> | undefined = undefined;

if (isPabili) {
  if (selectedCats.length === 0) {
    setValidationError('Please select at least one Pabili category.');
    return;
  }
  sanitizedCatItems = {};
  for (const cat of selectedCats) {
    const items = catItems[cat] || [];
    const validItems = items.map((i) => i.trim()).filter((i) => i.length > 0);
    if (validItems.length === 0) {
      setValidationError(`Please add at least one item for ${cat}.`);
      return;
    }
    sanitizedCatItems[cat] = validItems;
  }
}
```

Pass `catItems: isPabili ? sanitizedCatItems : undefined` into `OrderPayload`. This provides dual protection:
1. `catItems` contains only active `selectedCats` keys.
2. Item arrays contain non-empty, whitespace-trimmed string items.

---

## 3. Recommended Code Snippets & Diff Specification

```typescript
// Proposed changes for OrderFormScreen.tsx

// 1. toggleCategory function
const toggleCategory = (catName: string) => {
  setPabiliError(null);
  if (selectedCats.includes(catName)) {
    setSelectedCats(selectedCats.filter((c) => c !== catName));
    setCatItems((prev) => {
      const updated = { ...prev };
      delete updated[catName];
      return updated;
    });
  } else {
    if (selectedCats.length >= 3) {
      const msg = 'You can select up to 3 categories only.';
      setPabiliError(msg);
      Alert.alert('Category Limit', msg);
      return;
    }
    setSelectedCats([...selectedCats, catName]);
    if (!catItems[catName]) {
      setCatItems({ ...catItems, [catName]: [''] });
    }
  }
};

// 2. validateAndSubmit function
const validateAndSubmit = () => {
  setValidationError(null);

  const isPabili = selectedServices.includes('Pabili');
  const isPadala = selectedServices.includes('Padala');
  const isBills = selectedServices.includes('Bills Payment');

  let sanitizedCatItems: Record<string, string[]> | undefined = undefined;

  if (isPabili) {
    if (selectedCats.length === 0) {
      setValidationError('Please select at least one Pabili category.');
      return;
    }
    sanitizedCatItems = {};
    for (const cat of selectedCats) {
      const items = catItems[cat] || [];
      const validItems = items.map((i) => i.trim()).filter((i) => i.length > 0);
      if (validItems.length === 0) {
        setValidationError(`Please add at least one item for ${cat}.`);
        return;
      }
      sanitizedCatItems[cat] = validItems;
    }
  }

  if (isPadala) {
    if (!padalaItem.trim()) {
      setValidationError('Please enter parcel/item description for Padala.');
      return;
    }
    if (!padalaReceiver.trim()) {
      setValidationError('Please enter receiver name and address for Padala.');
      return;
    }
    if (!padalaReceiverPhone.trim()) {
      setValidationError('Please enter receiver phone number for Padala.');
      return;
    }
  }

  if (isBills) {
    if (!billsBiller.trim()) {
      setValidationError('Please enter the biller name for Bills Payment.');
      return;
    }
    if (!billsAccountNo.trim()) {
      setValidationError('Please enter the account/reference number.');
      return;
    }
    const numAmount = parseFloat(billsAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setValidationError('Please enter a valid bill amount greater than 0.');
      return;
    }
  }

  const payload: OrderPayload = {
    selectedServices,
    pabiliCats: isPabili ? selectedCats : undefined,
    catItems: isPabili ? sanitizedCatItems : undefined,
    padalaInfo: isPadala
      ? {
          item: padalaItem.trim(),
          sender: padalaSender.trim(),
          receiver: padalaReceiver.trim(),
          receiverPhone: padalaReceiverPhone.trim(),
        }
      : undefined,
    billsInfo: isBills
      ? {
          biller: billsBiller.trim(),
          accountNo: billsAccountNo.trim(),
          amount: parseFloat(billsAmount) || 0,
        }
      : undefined,
  };

  navigation.navigate('Checkout', { user, orderPayload: payload });
};
```

---

## 4. Test Suite Alignment

In `src/__tests__/OrderFormScreen.test.tsx`:
- Test `'tests Padala and Bills Payment input fields and successful validation submission'` (lines 58–99) must be updated to populate `padala-receiver-input`:
  ```typescript
  fireEvent.changeText(getByTestId('padala-receiver-input'), 'Juan Dela Cruz, Makati City');
  ```
  And expected `padalaInfo.receiver` in `orderPayload` assertion should be `'Juan Dela Cruz, Makati City'`.
