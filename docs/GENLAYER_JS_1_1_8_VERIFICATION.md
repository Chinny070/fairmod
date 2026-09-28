# genlayer-js@1.1.8 Verification (Stage 0)

## Method
Ran `npm install genlayer-js@1.1.8` in an isolated scratch workspace (not the fairmod repo) and inspected the installed package's compiled type declarations (`dist/index.d.ts`, `dist/index-C3Ul1Rte.d.ts`, `dist/index-BCPb0x30.d.ts`) and `package.json` directly, plus ran a small Node ESM probe script importing the real package to print `chains.studionet` at runtime. This is a direct package inspection, not a docs read — genlayer-js 2.x/Transaction Kit was never installed or substituted, per the user's explicit instruction.

## package.json
`"name": "genlayer-js", "version": "1.1.8", "type": "module"`, `main: dist/index.js`, `types: dist/index.d.ts`. Confirms the exact pinned version installs cleanly from npm.

## createClient / config
```ts
interface ClientConfig {
  chain?: { id: number; name: string; rpcUrls: {...}; nativeCurrency: {...}; blockExplorers?: {...} };
  endpoint?: string;
  account?: Account | Address;
  provider?: EthereumProvider;
}
declare const createClient: (config?: ClientConfig) => GenLayerClient<GenLayerChain>;
```
`provider` is the injected EIP-1193 wallet integration point — confirmed present.

## StudioNet chain object — runtime-verified (not just typed)
Ran `import { chains } from 'genlayer-js'; console.log(chains.studionet)` against the actual installed package:
```json
{
  "id": 61999,
  "isStudio": true,
  "name": "Genlayer Studio Network",
  "rpcUrls": { "default": { "http": ["https://studio.genlayer.com/api"] } },
  "nativeCurrency": { "name": "GEN Token", "symbol": "GEN", "decimals": 18 },
  "blockExplorers": { "default": { "name": "GenLayer Explorer", "url": "https://genlayer-explorer.vercel.app" } },
  "testnet": true,
  "consensusMainContract": { "address": "0xb7278A61aa25c888815aFC32Ad3cC52fF24fE575", "abi": [ ...full consensus contract ABI... ] }
}
```
This independently confirms — from the installed package itself, not from the product spec text — chain id `61999` and RPC `https://studio.genlayer.com/api`. The `Network` union type also literally includes `"studionet"` alongside `"localnet" | "testnetAsimov" | "testnetBradbury" | "mainnet"`.

## Read API
```ts
readContract(args: {
  account?: Account; address: Address; functionName: string;
  args?: CalldataEncodable[]; kwargs?: Map<string, CalldataEncodable> | {[k: string]: CalldataEncodable};
  rawReturn?: boolean; jsonSafeReturn?: boolean; transactionHashVariant?: TransactionHashVariant;
}) => Promise<CalldataEncodable | `0x${string}`>
```
Also `simulateWriteContract(...)` for a dry-run of a write.

## Write API
```ts
writeContract(args: {
  account?: Account; address: Address; functionName: string;
  args?: CalldataEncodable[]; kwargs?: ...; value: bigint;
  leaderOnly?: boolean; consensusMaxRotations?: number;
}) => Promise<any>
deployContract(args: { account?: Account; code: string | Uint8Array; args?; kwargs?; leaderOnly?; consensusMaxRotations? }) => Promise<`0x${string}`>
```
`value: bigint` is required (not optional) on `writeContract` — FairMod's write calls that don't intend to transfer GEN must still pass `value: 0n` explicitly per this signature.

## Wallet API
`provider` passed at `createClient` time is the EIP-1193 integration point; no separate "connect wallet" function was found at the top level beyond `connect(network?, snapSource?)` and `metamaskClient(snapSource?)` (the latter is MetaMask-snap-specific, not generic). Network switching itself is not a dedicated exported helper — it is expected to go through the provider's own standard `wallet_switchEthereumChain` request, with FairMod's frontend responsible for detecting a mismatch against `chains.studionet.id` before allowing writes (per `FRONTEND_INTEGRATION.md`).

## Transaction status / finalization API — the key "tx hash ≠ finality" primitive
```ts
enum TransactionStatus {
  UNINITIALIZED, PENDING, PROPOSING, COMMITTING, REVEALING, ACCEPTED,
  UNDETERMINED, FINALIZED, CANCELED, APPEAL_REVEALING, APPEAL_COMMITTING,
  READY_TO_FINALIZE, VALIDATORS_TIMEOUT, LEADER_TIMEOUT
}
const DECIDED_STATES: TransactionStatus[];
function isDecidedState(status: string): boolean;

getTransaction(args: { hash }) => Promise<GenLayerTransaction>
waitForTransactionReceipt(args: { hash, status?: TransactionStatus, interval?, retries? }) => Promise<GenLayerTransaction>
getTransactionQueuePosition(args: { hash }) => Promise<number>
```
This is real, verified, and directly answers the build brief's finality-representation requirement: the frontend must call `waitForTransactionReceipt({ hash, status: TransactionStatus.FINALIZED })` (or poll `getTransaction` and check the returned status against `isDecidedState`/`DECIDED_STATES` for the intermediate "decided" UI state) rather than treating a returned transaction hash, or even `ACCEPTED`, as done.

## Protocol-level appeal vs FairMod's application-level challenge — confirmed as genuinely separate mechanisms
```ts
canAppeal(args: { txId }) => Promise<boolean>
appealTransaction(args: { account?, txId, value? }) => Promise<any>
finalizeTransaction(args: { account?, txId }) => Promise<`0x${string}`>
finalizeIdlenessTxs(args: { account?, txIds }) => Promise<`0x${string}`>
getMinAppealBond(args: { txId }) => Promise<...>
```
These exist in the SDK as GenLayer **protocol** appeal/finality operations (bonded appeals against the consensus process itself). FairMod's own challenge system (Stage 4, `CHALLENGES_AND_FINALITY.md`) is explicitly a separate, contract-level, application concept and must not be confused with or built on top of calling `appealTransaction` — that call is about disputing the GenVM consensus round itself, not about FairMod's moderation-outcome challenge workflow.

## Payable/value behavior
`writeContract`'s `value: bigint` is mandatory in the type signature (not optional) — every FairMod write call needs an explicit value, `0n` for non-paying calls. `deployContract` has no `value` field in this version's signature (deployment-time value transfer is not exposed here, unlike the contract-side `deploy_contract(..., value=...)` seen in the Python SDK — this asymmetry is noted, not resolved, and should be re-checked if Stage 1/9 needs to send value at deploy time from the frontend).

## Not yet verified
- Live network round-trip (createClient against the real StudioNet RPC, an actual read/write) — no live call was made in Stage 0, per the hard stop.
- Whether `chains.studionet.rpcUrls` matches what a live `https://studio.genlayer.com/api` health check actually returns (package data vs live endpoint reachability are different claims).
