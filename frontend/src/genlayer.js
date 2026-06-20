import { createAccount, createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

const account = createAccount();
const configuredContractAddress = import.meta.env.VITE_CONTRACT_ADDRESS?.trim();

export const client = createClient({ chain: studionet, account });
export const CONTRACT_ADDRESS = configuredContractAddress || "0x0000000000000000000000000000000000000000";

let initialized = false;

export function getAccountAddress() {
  return account.address ?? "Generated local account";
}

async function ensureInitialized() {
  if (!initialized && typeof client.initializeConsensusSmartContract === "function") {
    await client.initializeConsensusSmartContract();
  }
  initialized = true;
}

async function write(functionName, args, value = 0n) {
  if (CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") {
    throw new Error("Set VITE_CONTRACT_ADDRESS in frontend/.env first.");
  }
  await ensureInitialized();
  const hash = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName,
    args,
    value: BigInt(value),
  });
  return client.waitForTransactionReceipt({
    hash,
    status: TransactionStatus.FINALIZED,
    fullTransaction: false,
  });
}

async function read(functionName, args = []) {
  if (CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") {
    throw new Error("Set VITE_CONTRACT_ADDRESS in frontend/.env first.");
  }
  await ensureInitialized();
  return client.readContract({ address: CONTRACT_ADDRESS, functionName, args });
}

function parseJsonResult(value) {
  if (typeof value !== "string") return value;
  return JSON.parse(value);
}

export const createBounty = (name, identity, baseReward, fundWei) =>
  write("create_bounty", [name, identity, BigInt(baseReward)], BigInt(fundWei));

export const topUp = (id, fundWei) => write("top_up_bounty", [id], BigInt(fundWei));
export const submitReport = (id, url, stakeWei) => write("submit_report", [id, url], BigInt(stakeWei));
export const evaluate = (reportId) => write("evaluate_report", [reportId]);
export const withdraw = (id) => write("deactivate_and_withdraw", [id]);
export const claimEarnings = () => write("withdraw", []);

export const getBounty = async (id) => parseJsonResult(await read("get_bounty", [id]));
export const getReport = async (id) => parseJsonResult(await read("get_report", [id]));
export const bountyCount = async () => BigInt(await read("get_bounty_count"));
export const reportCount = async () => BigInt(await read("get_report_count"));
export const getReportStake = async () => BigInt(await read("get_report_stake"));
export const getPendingBalance = async (addr) => BigInt(await read("get_pending_balance", [addr]));
export const getLeaderboard = async () => parseJsonResult(await read("get_leaderboard_top10"));
export const getHunterProfile = async (addr) => parseJsonResult(await read("get_hunter_profile", [addr]));
