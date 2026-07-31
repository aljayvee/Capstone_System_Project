# Project Workspace & Reference UI Invariants

1. **Workspace Root**: The primary web application code (React, TypeScript, CSS, components, routing, state management) MUST be developed directly in `c:\Capstone_Project_Web`.
2. **Reference UI Isolation**: The directory `FigmaPrototype/Designprototypecreation` is exclusively a reference mockup directory. Do NOT write main capstone application code inside `FigmaPrototype/Designprototypecreation`.
3. **Target Platform**: Focus on Web Only (`Capstone_Project_Web`).

## Folder Structure (Updated)

The Capstone project is split across TWO root directories:

### Web + Backend
```
C:\Capstone_Project_Web\
├── Backend\          ← Node.js/Express API server
├── src\              ← Web Dashboard (Vite + React/TS)
└── server\
```

### Mobile Apps (SEPARATE location — NOT inside Capstone_Project_Web)
```
C:\Capstone_Project_Mobile_App\
├── CustomerApp\      ← React Native / Expo (Customer-facing)
└── RiderMobileApp\   ← React Native / Expo (Rider-facing)
```

> **Important:** Do NOT assume `CustomerApp` or `RiderMobileApp` are inside `Capstone_Project_Web`. They have been moved to `C:\Capstone_Project_Mobile_App\`.

## GitHub Repositories

| Project | Repository URL |
|---|---|
| Web Dashboard + Backend | https://github.com/aljayvee/Capstone_System_Project.git |
| Customer App | https://github.com/aljayvee/Capstone_System_Project_Customer_App.git |
| Rider App | https://github.com/aljayvee/Capstone_System_Project_Rider_App.git |
