# AgroVerify Frontend

AgroVerify is a role-based blockchain-enabled fertilizer distribution interface designed for public-sector agricultural operations. This frontend presents two professional user experiences in one application:

- `Admin Frontend`: district leadership oversight for officer authorization, farmer approval, locations, allocation, distribution, audit, and system settings.
- `Officer Frontend`: field operations workflow for farmer registration, assigned-area activity, and distribution support.

The system is designed to feel like a real Ministry operations platform rather than a developer demo. It combines a clean administrative interface with location-aware registration logic and on-chain verification through MetaMask and the `AgriTrust` contract.

## Why This Project Is Unique

- `Public-sector oriented UX`: the interface is written and styled for Ministry officers and district administrators, not only for technical users.
- `Single codebase, two frontends`: admin and officer experiences are resolved by connected wallet role instead of maintaining separate apps.
- `Blockchain-backed governance`: officer authorization, farmer registration, approvals, and distribution-related reads are connected to on-chain records.
- `Location-aware registration`: the frontend uses a seeded province-district-ward-village tree so officers register farmers within the correct assigned area.
- `Presentation-ready design`: the Officers module was refined into a professional operational dashboard suitable for demos, assessments, and academic presentation.

## System Overview

AgroVerify frontend is a React application built with Create React App and `ethers.js`. It connects to a deployed `AgriTrust` smart contract and optionally interoperates with an HTTP backend for API-driven modules.

### Main Roles

#### 1. District Admin Frontend

The admin experience includes:

- `Dashboard`: high-level view of mapped on-chain farmer data.
- `Farmers`: approve or reject pending farmer registrations.
- `Officers`: authorize, activate, deactivate, and review officer records.
- `Locations`: browse the seeded province, district, ward, and village structure.
- `Allocation`: calculate and review allocation scope.
- `Distribution`: create distribution windows and monitor schedule execution.
- `Audit`: inspect and export audit-related records.
- `Settings`: manage administrative configuration and officer-related controls.

#### 2. Officer Frontend

The officer experience includes:

- `Farmer Registration`: register farmers directly on-chain from the assigned location scope.
- `Farmer Review Visibility`: view registered farmer details associated with operational work.
- `Distribution View`: access officer-relevant distribution windows.
- `Role-aware Navigation`: officers only see pages relevant to field operations.

## Key Features

### 1. Role-Based Wallet Login

- Login is performed through MetaMask.
- Roles are resolved from the blockchain.
- Supported roles:
  - `Admin`
  - `Officer`

### 2. On-Chain Officer Management

District administrators can:

- authorize new officers
- reactivate inactive officers
- deactivate active officers
- review officer status and assignment information

### 3. Location-Aware Farmer Registration

The frontend includes a seeded location tree in:

- [src/constants/locations.js](C:/Users/admin/Desktop/agroVerify/frontend/admin-portal/src/constants/locations.js)

This supports:

- automatic province and district assignment
- ward and village dropdowns for officers
- consistent location strings sent to the contract
- recovery of incomplete legacy location strings such as village-only records

Current scoped configuration:

- `Province`: Central
- `District`: Kabwe

### 4. Smart Contract Integration

The app integrates with `AgriTrust` through:

- [src/lib/agriTrust.js](C:/Users/admin/Desktop/agroVerify/frontend/admin-portal/src/lib/agriTrust.js)

Examples of connected operations:

- `registerFarmer`
- `verifyFarmer`
- `rejectFarmer`
- `createOfficer`
- `activateOfficer`
- `deactivateOfficer`
- `createSchedule`
- `confirmDistribution`

### 5. Professional Operational UI

Recent design work improved the system to better reflect a real government operations platform:

- removed distracting wallet-balance emphasis
- added icon-led officer dashboard cards
- simplified and professionalized the Officers module
- preserved a restrained visual hierarchy with one primary green highlight
- improved wording around district operations and assigned areas

## Project Structure

```text
admin-portal/
├── public/
├── src/
│   ├── api/                  # API client and offline fallback handling
│   ├── Components/           # Shared UI components, cards, modals, icons
│   ├── constants/            # Seeded location data
│   ├── context/              # Wallet and user session state
│   ├── contracts/            # AgriTrust ABI JSON
│   ├── lib/                  # Blockchain integration and location helpers
│   ├── Pages/                # Route-level admin and officer screens
│   ├── App.js                # App composition and role-aware routing
│   └── theme.js              # Shared visual tokens
├── .env
├── .env.example
├── package.json
└── README.md
```

## Frontend Modules

### Admin Frontend Modules

- `Dashboard`
- `Farmers`
- `Officers`
- `Locations`
- `Allocation`
- `Distribution`
- `Audit`
- `Settings`

### Officer Frontend Modules

- `Farmers`
- `Dashboard`
- `Distribution`

The routing is role-aware and controlled in:

- [src/App.js](C:/Users/admin/Desktop/agroVerify/frontend/admin-portal/src/App.js)

## Environment Variables

The app uses the following main environment variables:

```env
REACT_APP_API_BASE_URL=http://127.0.0.1:8000/api
REACT_APP_CONTRACT_ADDRESS=0x...
REACT_APP_CHAIN_ID=31337
REACT_APP_RPC_URL=http://127.0.0.1:8545
REACT_APP_OFFICER_PROVINCE=Central
REACT_APP_OFFICER_DISTRICT=Kabwe
```

### Variable Purpose

- `REACT_APP_API_BASE_URL`: backend API base URL
- `REACT_APP_CONTRACT_ADDRESS`: deployed AgriTrust contract address
- `REACT_APP_CHAIN_ID`: blockchain network id
- `REACT_APP_RPC_URL`: local RPC endpoint
- `REACT_APP_OFFICER_PROVINCE`: officer registration scope province
- `REACT_APP_OFFICER_DISTRICT`: officer registration scope district

## Installation

### 1. Install dependencies

```bash
npm install
```

### 2. Start the frontend

```bash
npm start
```

The app runs at:

- `http://localhost:3000`

### 3. Create a production build

```bash
npm run build
```

## Development Requirements

For full functionality, the following services should be available:

- `MetaMask` browser extension
- local blockchain node or configured RPC endpoint
- deployed `AgriTrust` contract
- optional backend API server if backend-powered endpoints are enabled

## User Flow

### Admin Workflow

1. Connect MetaMask.
2. The app resolves the connected wallet as `Admin`.
3. Review officers, farmers, locations, schedules, and audit data.
4. Approve or reject farmer records.
5. Authorize or deactivate officers.
6. Create distribution schedules and monitor execution.

### Officer Workflow

1. Connect MetaMask.
2. The app resolves the connected wallet as `Officer`.
3. The officer sees role-limited pages only.
4. In the Farmers page, location scope is already aligned to `Central / Kabwe`.
5. The officer selects ward and village from seeded options.
6. The farmer is registered on-chain with a full structured location string.

## Seeded Location Logic

Location helpers live in:

- [src/lib/locations.js](C:/Users/admin/Desktop/agroVerify/frontend/admin-portal/src/lib/locations.js)

The helper layer is responsible for:

- normalizing location strings
- reading the seeded tree
- resolving officer assignment defaults
- mapping ward and village options
- recovering incomplete old records
- building the final `Province / District / Ward / Village` location string

## Important Technical Notes

### Blockchain-Only Fallback Behavior

The API client includes fallback behavior for some GET requests when backend mode is disabled. This allows the frontend to remain usable for blockchain-driven demonstrations even if a backend is unavailable.

See:

- [src/api/client.js](C:/Users/admin/Desktop/agroVerify/frontend/admin-portal/src/api/client.js)

### Role Resolution

Wallet and session state are managed through:

- [src/context/WalletContext.jsx](C:/Users/admin/Desktop/agroVerify/frontend/admin-portal/src/context/WalletContext.jsx)

### Login Screen

The login and wallet-connection entry point is:

- [src/Pages/Login.jsx](C:/Users/admin/Desktop/agroVerify/frontend/admin-portal/src/Pages/Login.jsx)

## Scripts

```bash
npm start      # Start development server
npm run build  # Build production bundle
npm test       # Run tests
```

## Demonstration Highlights For Lecturers

If you are presenting this project, these are strong points to emphasize:

- the interface supports both administrative and field-operational users
- the design was intentionally improved to reflect a real institutional system
- officer workflows are constrained by seeded location governance
- blockchain is used for transparency, role validation, and record traceability
- the project combines smart-contract integration, user-interface design, and public-sector workflow thinking

## Suggested Presentation Summary

AgroVerify is not just a blockchain prototype. It is a role-based agricultural operations frontend that demonstrates how decentralized verification can be adapted into a practical government service interface. The application shows technical competence in React, blockchain integration, state management, role-aware UX, seeded geographic data handling, and professional system presentation.

## Current Status

The frontend has been successfully built after the latest improvements, including:

- professional Officers dashboard redesign
- location-tree integration
- automatic `Central / Kabwe` scope handling
- district-specific wording updates
- neutralized top operational card styling for a more formal layout

## Authoring Note

This README is structured to serve both as:

- a technical handover document
- a project presentation companion for assessment, demo, or deployment review
