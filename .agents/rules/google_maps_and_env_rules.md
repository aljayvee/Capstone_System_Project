# Google Maps API & Environment Key Guardrails

1. **Environment Variable Security**:
   - ALWAYS load Google Maps API keys strictly from `.env` environment variables (`import.meta.env.VITE_GOOGLE_MAPS_API_KEY` for Web Vite projects or `process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` for React Native/Expo).
   - NEVER hardcode API key string literals directly into source code files (`.ts`, `.tsx`, `.js`).

2. **Google Maps Script Loading (Web)**:
   - When dynamically appending the Google Maps JavaScript API script element on Web apps, ALWAYS include `loading=async` in the script `src` URL (`https://maps.googleapis.com/maps/api/js?key=${KEY}&libraries=places&loading=async`) to adhere to Google Maps performance best practices.

3. **3NF Relational Errand Schema**:
   - Store pinpoints must be stored in the 3NF table `store_pinpoints` (`id`, `orderId`, `storeName`, `latitude`, `longitude`, `createdAt`, `updatedAt`), linked to `pabili_orders(orderId)`.
   - Max 3 store pinpoints per errand order.
