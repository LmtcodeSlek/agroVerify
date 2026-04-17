# AgroVerify Blockchain Layer

This project implements the blockchain side of the AgroVerify admin flow:

Admin UI (React) -> Backend API (Express) -> ethers.js -> AgriTrust Solidity contract -> Local chain (Hardhat/Ganache)

## Implemented blockchain triggers

1. Farmer verification (Admin):
- `POST /api/farmers/register`
- `POST /api/farmers/approve`

0. Officer provisioning (Admin -> Officer app):
- `POST /api/officers/create` (admin-only; generates officer blockchain key + locked assignment)
- `GET /api/officers/:officerId/assignment` (officer app pre-fill for locked fields)
- `POST /api/officers/login` (demo login)
- `POST /api/officers/:officerId/change-password` (re-encrypts officer keystore)

2. Allocation policy (Admin):
- `POST /api/allocation/create`

3. Distribution confirmation (Officer/Admin view):
- `POST /api/distribution/confirm`

4. Audit trail:
- `GET /api/audit/logs`

All write endpoints generate a SHA-256 data hash in backend and store immutable proof on-chain.

## Smart contract

Contract: `contracts/AgriTrust.sol`

Core functions:
- `registerFarmer(uint farmerId, string dataHash)`
- `verifyFarmer(uint farmerId)`
- `recordAllocation(uint policyId, string dataHash, uint bagsPerFarmer, uint totalBags)`
- `recordDistribution(uint farmerId, uint scheduleId, string dataHash, uint bagsGiven)`

## Backend API

Server: `backend/src/server.js`

Environment variables:

```bash
PORT=4000
RPC_URL=http://127.0.0.1:8545
SIGNER_PRIVATE_KEY=<private_key_for_local_chain_account>
AGRITRUST_CONTRACT_ADDRESS=<deployed_contract_address>
ADMIN_KEY=<shared_secret_for_admin_only_endpoints>
```

## Frontend (React + MetaMask)

App: `frontend/`

Environment variables (create `frontend/.env` from `frontend/.env.example`):

```bash
VITE_AGRITRUST_CONTRACT_ADDRESS=<deployed_contract_address>
VITE_RPC_URL=http://127.0.0.1:8545
VITE_API_BASE_URL=http://localhost:4000
VITE_DEPLOY_BLOCK=<optional_deploy_block_number>
```

Run:

```bash
cd frontend
npm install
npm run dev
```

The UI (blockchain-only mode):
- Connects MetaMask (connect button + address)
- Uses the signer to send txs (`registerFarmer`, `verifyFarmer`, `recordDistribution`)
- Shows `tx hash`, `block number`, and success status after mining
- Fetches farmer records by scanning `FarmerRegistered` events and calling `getFarmer()`
 - Generates a SHA-256 `dataHash` in-browser (no DB required)

## Run locally (Hardhat)

1. Install deps:

```bash
npm install
```

2. Start local chain:

```bash
npm run chain
```

3. In a new terminal, deploy contract:

```bash
npm run deploy:local
```

4. Set `AGRITRUST_CONTRACT_ADDRESS` from deployment output in your `.env`.

5. Start API:

```bash
npm run api
```

6. Run tests:

```bash
npm test
```

## Example approve flow

Frontend:

```js
fetch("/api/farmers/approve", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ farmerId: 101 }),
});
```

Response:

```json
{
  "message": "Farmer approved",
  "txHash": "0x...",
  "registerTxHash": "0x...",
  "dataHash": "0x...",
  "blockNumber": 12
}
```

## Officer create + locked location (example)

Admin creates an officer and assigns province/district/ward. The officer app should fetch
`/api/officers/:officerId/assignment` and render those fields disabled (faint), so the officer can’t edit them.

```js
fetch("/api/officers/create", {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-Admin-Key": process.env.ADMIN_KEY },
  body: JSON.stringify({
    name: "Louis",
    email: "louismubangaImt@gmail.com",
    province: "Central",
    district: "Kabwe",
    ward: "Kabwe Central", // optional
    initialPassword: "TempPass123!",
  }),
});
```

## Farmer registration with auto-filled province/district (example)

If the admin/officer assignment is `Central / Chisamba`, the officer app should only ask for the farmer’s `village`
and send that to the backend. The backend will build the full location and hash it before writing on-chain.

```js
fetch("/api/farmers/register", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    farmerId: 101,
    name: "Jane Farmer",
    officerId: "1",
    location: { village: "Mungule" },
  }),
});
```
