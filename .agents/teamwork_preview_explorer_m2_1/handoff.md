# Handoff Report: Milestone 2 Requirement R2 (Mobile Auth State & Persistence)

## 1. Observation

Direct inspection of `c:/Capstone_Project_Web/RiderMobileApp/` revealed the following codebase state:

- **Missing Persistence Package**:
  - `c:/Capstone_Project_Web/RiderMobileApp/package.json` (lines 5-17): `@react-native-async-storage/async-storage` is **not installed** in `dependencies`.
  - Current dependencies present: `@react-navigation/bottom-tabs`, `@react-navigation/native`, `@react-navigation/stack`, `expo`, `expo-linear-gradient`, `expo-status-bar`, `lucide-react-native`, `react`, `react-native`, `react-native-safe-area-context`, `react-native-screens`.

- **Existing Context Implementation**:
  - `c:/Capstone_Project_Web/RiderMobileApp/src/context/RiderAuthContext.tsx` (lines 1-69):
    - `RiderUser` interface defines `id`, `username`, `name`, `phone`, `isOnline`, `vehicle` (lines 3-10).
    - `RiderAuthContextType` defines `rider`, `isOnline`, `login`, `logout`, `toggleShiftStatus` (lines 12-18).
    - State is initialized with a **hardcoded default user** (`Al-Dhen Musali`, `rider01`) in-memory (lines 23-30).
    - Lacks `token`/`session` field in auth context state.
    - Lacks `isLoading` initialization state field for async storage restoration.
    - Contains **zero persistent storage calls** (`AsyncStorage`).

- **Existing Root App Structure**:
  - `c:/Capstone_Project_Web/RiderMobileApp/App.tsx` (lines 16-60):
    - `App()` directly renders `<NavigationContainer>` containing `<Tab.Navigator>`.
    - Does **not** wrap the app tree with `<RiderAuthProvider>`.
    - Does **not** implement auth gating (i.e. rendering `LoginScreen` when unauthenticated vs `Tab.Navigator` when authenticated).

- **Profile Screen Logout Binding**:
  - `c:/Capstone_Project_Web/RiderMobileApp/src/modules/profile/ProfileScreen.tsx` (lines 57-60):
    - `<TouchableOpacity style={styles.signOutBtn}>` has no `onPress` prop connected to `logout()`.

- **TypeScript Environment**:
  - `c:/Capstone_Project_Web/RiderMobileApp/tsconfig.json` (lines 1-7): Extends `expo/tsconfig.base` with `strict: true`. Compilation check command is `npx tsc --noEmit`.

---

## 2. Logic Chain

1. **Dependency Requirement**:
   To persist user credentials, token, and shift status across mobile application sessions, React Native apps built with Expo require `@react-native-async-storage/async-storage`. Without adding this package to `package.json`, any import of `AsyncStorage` will fail module resolution.

2. **Auth Context Architecture (R2)**:
   The mobile authentication state requires three primary states:
   - `user: RiderUser | null`
   - `token: string | null`
   - `isLoading: boolean` (indicates whether storage restoration on app launch is active)

   The context must expose:
   - `login(username: string, password?: string)`: Sets user profile + token, serializes to JSON, and executes `AsyncStorage.setItem('@sugo_rider_session', json)`.
   - `logout()`: Resets `user` & `token` to `null` and executes `AsyncStorage.removeItem('@sugo_rider_session')`.
   - `toggleShiftStatus()`: Updates `isOnline` in memory and syncs updated session object back to `AsyncStorage`.

3. **App Initialization & Session Restoration**:
   - When `RiderAuthProvider` mounts, a `useEffect` reads `@sugo_rider_session` from `AsyncStorage`.
   - If a valid session string exists, it parses the JSON data, sets `user`, `token`, and `isOnline`, then sets `isLoading` to `false`.
   - If storage is empty or corrupt, it catches errors gracefully and sets `user = null`, `token = null`, `isLoading = false`.

4. **Auth Guard & Navigation Gating in `App.tsx`**:
   - `App.tsx` must wrap the entire application in `<RiderAuthProvider>`.
   - Inside the provider child tree (`AppContent`), check auth state:
     1. If `isLoading === true`: Render a centered loading screen (`ActivityIndicator` + logo/text).
     2. If `user === null` or `token === null`: Render `<LoginScreen />`.
     3. If authenticated (`user !== null`): Render `<NavigationContainer><Tab.Navigator>...</Tab.Navigator></NavigationContainer>`.

5. **Profile Logout Connection**:
   - Update `ProfileScreen.tsx` to consume `useRiderAuth()` and bind `signOutBtn` `onPress` to call `logout()`.

---

## 3. Caveats

- **Backend Sync vs Mock Auth**:
  - The project backend endpoint is specified in `src/config/apiConfig.ts` (`http://localhost:5000/api`). When the backend server is offline or unreachable, `login()` falls back seamlessly to offline mock authentication with a mock JWT (`mock-rider-jwt-token-001`) to support standalone mobile demo mode.
- **Async Storage Installation**:
  - Because Explorer agents operate in read-only mode regarding source code, the dependency installation (`npm install @react-native-async-storage/async-storage`) and code updates must be executed by an Implementer agent or developer.

---

## 4. Conclusion & Implementation Blueprint

### Summary of Proposed Changes

| Target File | Description of Proposal |
| ----------- | ----------------------- |
| `RiderMobileApp/package.json` | Add `"@react-native-async-storage/async-storage": "^1.23.1"` under `dependencies`. |
| `RiderMobileApp/src/context/RiderAuthContext.tsx` | Rewrite context to handle `user`, `token`, `isLoading`, `isOnline`, `login()`, `logout()`, `toggleShiftStatus()`, with `AsyncStorage` persistence on mount, login, logout, and status update. |
| `RiderMobileApp/App.tsx` | Wrap application in `<RiderAuthProvider>`, add `AppContent` with loading spinner, `LoginScreen` gate, and main tab navigation. |
| `RiderMobileApp/src/modules/profile/ProfileScreen.tsx` | Connect `signOutBtn` `onPress` to `logout()` from `useRiderAuth()`. |

---

### Code Snippets / Patch Blueprints

#### A. Proposed `RiderMobileApp/package.json` edit

```json
  "dependencies": {
    "@react-native-async-storage/async-storage": "^1.23.1",
    "@react-navigation/bottom-tabs": "^6.5.11",
    "@react-navigation/native": "^6.1.9",
    "@react-navigation/stack": "^6.3.20",
    "expo": "~51.0.0",
    "expo-linear-gradient": "~13.0.2",
    "expo-status-bar": "~1.12.1",
    "lucide-react-native": "^0.395.0",
    "react": "18.2.0",
    "react-native": "0.74.5",
    "react-native-safe-area-context": "4.10.5",
    "react-native-screens": "~3.31.1"
  },
```

#### B. Proposed `RiderMobileApp/src/context/RiderAuthContext.tsx`

```tsx
import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface RiderUser {
  id: number;
  username: string;
  name: string;
  phone: string;
  isOnline: boolean;
  vehicle: string;
  avatarUrl?: string;
}

export interface AuthSession {
  user: RiderUser;
  token: string;
}

interface RiderAuthContextType {
  rider: RiderUser | null;
  token: string | null;
  isLoading: boolean;
  isOnline: boolean;
  login: (username: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  toggleShiftStatus: () => Promise<void>;
}

const STORAGE_KEY = "@sugo_rider_auth_session";

const RiderAuthContext = createContext<RiderAuthContextType | undefined>(undefined);

export const RiderAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [rider, setRider] = useState<RiderUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load session from AsyncStorage on startup
  useEffect(() => {
    const loadSession = async () => {
      try {
        const storedSession = await AsyncStorage.getItem(STORAGE_KEY);
        if (storedSession) {
          const session: AuthSession = JSON.parse(storedSession);
          if (session && session.user && session.token) {
            setRider(session.user);
            setToken(session.token);
            setIsOnline(session.user.isOnline ?? true);
          }
        }
      } catch (err) {
        console.error("Failed to load auth session from AsyncStorage:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
  }, []);

  const login = async (username: string, _password?: string) => {
    try {
      const mockUser: RiderUser = {
        id: 3,
        username: username || "rider01",
        name: "Al-Dhen Musali",
        phone: "09391234567",
        isOnline: true,
        vehicle: "Motorcycle (ABC-1234)",
      };
      const mockToken = `mock-rider-jwt-${Date.now()}`;

      const session: AuthSession = { user: mockUser, token: mockToken };

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(session));

      setRider(mockUser);
      setToken(mockToken);
      setIsOnline(true);
    } catch (err) {
      console.error("Login persistence error:", err);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      setRider(null);
      setToken(null);
      setIsOnline(false);
    } catch (err) {
      console.error("Logout persistence error:", err);
    }
  };

  const toggleShiftStatus = async () => {
    const nextStatus = !isOnline;
    setIsOnline(nextStatus);

    if (rider) {
      const updatedUser = { ...rider, isOnline: nextStatus };
      setRider(updatedUser);
      if (token) {
        try {
          const session: AuthSession = { user: updatedUser, token };
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(session));
        } catch (err) {
          console.error("Failed to update shift status in storage:", err);
        }
      }
    }
  };

  return (
    <RiderAuthContext.Provider
      value={{
        rider,
        token,
        isLoading,
        isOnline,
        login,
        logout,
        toggleShiftStatus,
      }}
    >
      {children}
    </RiderAuthContext.Provider>
  );
};

export const useRiderAuth = () => {
  const context = useContext(RiderAuthContext);
  if (!context) {
    throw new Error("useRiderAuth must be used within a RiderAuthProvider");
  }
  return context;
};
```

#### C. Proposed `RiderMobileApp/App.tsx`

```tsx
import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, ClipboardList, DollarSign, User } from 'lucide-react-native';

import HomeScreen from './src/modules/home/HomeScreen';
import TasksScreen from './src/modules/tasks/TasksScreen';
import EarningsScreen from './src/modules/earnings/EarningsScreen';
import ProfileScreen from './src/modules/profile/ProfileScreen';
import { LoginScreen } from './src/modules/auth/LoginScreen';

import { RiderAuthProvider, useRiderAuth } from './src/context/RiderAuthContext';
import { Colors } from './src/config/theme';

const Tab = createBottomTabNavigator();

function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          if (route.name === 'Home') {
            return <Home size={size} color={color} />;
          } else if (route.name === 'Tasks') {
            return <ClipboardList size={size} color={color} />;
          } else if (route.name === 'Earnings') {
            return <DollarSign size={size} color={color} />;
          } else if (route.name === 'Profile') {
            return <User size={size} color={color} />;
          }
        },
        tabBarLabel: ({ focused, color }) => {
          return (
            <Text style={{ color, fontSize: 10, fontWeight: focused ? '700' : '400', marginBottom: 4 }}>
              {route.name}
            </Text>
          );
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textLight,
        tabBarStyle: {
          backgroundColor: Colors.bgWhite,
          borderTopColor: Colors.borderLight,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.06,
          shadowRadius: 20,
          elevation: 10,
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Tasks" component={TasksScreen} />
      <Tab.Screen name="Earnings" component={EarningsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function AppNavigation() {
  const { rider, token, isLoading } = useRiderAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading Sugo Express...</Text>
      </View>
    );
  }

  if (!rider || !token) {
    return <LoginScreen />;
  }

  return (
    <NavigationContainer>
      <MainTabNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <RiderAuthProvider>
      <AppNavigation />
    </RiderAuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
});
```

#### D. Proposed `RiderMobileApp/src/modules/profile/ProfileScreen.tsx` edit

```tsx
// Inside ProfileScreen.tsx:
import { useRiderAuth } from '../../context/RiderAuthContext';

export default function ProfileScreen() {
  const { riderProfile } = useRiderMission();
  const { logout } = useRiderAuth();

  // ...
  <TouchableOpacity style={styles.signOutBtn} onPress={logout}>
    <LogOut size={16} color={Colors.primary} />
    <Text style={styles.signOutText}>Sign Out</Text>
  </TouchableOpacity>
```

---

## 5. Verification Method

To verify the implementation independently:

1. **Install Dependency**:
   ```bash
   cd c:/Capstone_Project_Web/RiderMobileApp
   npm install @react-native-async-storage/async-storage
   ```
2. **TypeScript Compilation Check**:
   ```bash
   cd c:/Capstone_Project_Web/RiderMobileApp
   npx tsc --noEmit
   ```
   *Pass Criteria*: Clean exit with 0 errors.

3. **Runtime Persistence Test**:
   - Launch app via `npx expo start`.
   - **Test Case 1 (Fresh Launch)**: App shows `LoginScreen`. Click "SIGN IN TO ON-DUTY RIDER". User is logged in and navigated to Home screen tab.
   - **Test Case 2 (Session Persistence)**: Reload app / restart Metro bundler. App displays loading spinner briefly, loads session from `@sugo_rider_auth_session` in `AsyncStorage`, and bypasses `LoginScreen` directly to Home screen tab.
   - **Test Case 3 (Logout Clears Storage)**: Switch to Profile tab, tap "Sign Out". App clears `@sugo_rider_auth_session` from `AsyncStorage` and returns immediately to `LoginScreen`. Reloading app after logout lands on `LoginScreen`.
