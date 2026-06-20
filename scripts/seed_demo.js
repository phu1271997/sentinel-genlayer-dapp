import { createAccount, createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

// Load environment variables from frontend/.env
const envPath = path.resolve(process.cwd(), "frontend/.env");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

const contractAddress = process.env.VITE_CONTRACT_ADDRESS?.trim();

if (!contractAddress || contractAddress === "0x0000000000000000000000000000000000000000") {
  console.error("Error: VITE_CONTRACT_ADDRESS is not set or is the placeholder.");
  console.error("Please deploy the contract in GenLayer Studio and set VITE_CONTRACT_ADDRESS in frontend/.env first.");
  process.exit(1);
}

console.log(`Seeding Sentinel contract at: ${contractAddress}`);

// Create accounts for seeding
const accountBrand = createAccount();
const accountHunter = createAccount();

const clientBrand = createClient({ chain: studionet, account: accountBrand });
const clientHunter = createClient({ chain: studionet, account: accountHunter });

async function writeContract(client, functionName, args, value = 0n) {
  const hash = await client.writeContract({
    address: contractAddress,
    functionName,
    args,
    value,
  });
  console.log(`Transaction sent: ${functionName}. Hash: ${hash}`);
  const receipt = await client.waitForTransactionReceipt({
    hash,
    status: TransactionStatus.FINALIZED,
    fullTransaction: false,
  });
  console.log(`Transaction finalized: ${functionName}. Status: ${receipt.status}`);
  return receipt;
}

async function main() {
  try {
    // Initialize client consensus if applicable
    if (typeof clientBrand.initializeConsensusSmartContract === "function") {
      console.log("Initializing consensus client...");
      await clientBrand.initializeConsensusSmartContract();
      await clientHunter.initializeConsensusSmartContract();
    }

    // 1. Create Bounties
    console.log("\n--- Seeding Bounties ---");
    
    // Bounty 1: Acme Wallet
    await writeContract(
      clientBrand,
      "create_bounty",
      [
        "Acme Wallet",
        "Official website: acme-wallet.xyz. Legitimate app download is only via google play store / app store. We never DM or ask for recovery phrases.",
        200000000000000000n, // 0.2 GEN base reward
      ],
      1000000000000000000n // 1.0 GEN funding pool
    );

    // Bounty 2: Jupiter Exchange
    await writeContract(
      clientBrand,
      "create_bounty",
      [
        "Jupiter Exchange",
        "Official domain: jup.ag. We only launch tokens through our official site. Watch out for fake lookalike domains on X (Twitter).",
        300000000000000000n, // 0.3 GEN base reward
      ],
      1500000000000000000n // 1.5 GEN funding pool
    );

    // 2. Set dynamic stake requirements (e.g. 0.05 GEN)
    console.log("\n--- Setting Stake Gating ---");
    await writeContract(clientBrand, "set_report_stake", [50000000000000000n]); // 0.05 GEN

    // 3. Submit Reports
    console.log("\n--- Submitting Suspect Reports ---");
    
    // Report 1: Phishing URL for Acme Wallet (will confirm)
    await writeContract(
      clientHunter,
      "submit_report",
      ["0", "https://login-acme-wallets.xyz"],
      50000000000000000n // 0.05 GEN stake
    );

    // Report 2: Normal URL for Acme Wallet (will reject)
    await writeContract(
      clientHunter,
      "submit_report",
      ["0", "https://acme-wallet.xyz"],
      50000000000000000n // 0.05 GEN stake
    );

    // Report 3: Phishing URL for Jupiter (will appeal)
    await writeContract(
      clientHunter,
      "submit_report",
      ["1", "https://jup-tokens.xyz"],
      50000000000000000n // 0.05 GEN stake
    );

    console.log("\nSeed script execution completed successfully!");
    console.log("Use GenLayer Studio or frontend to run evaluations and test reputation upgrades.");
  } catch (error) {
    console.error("Error seeding data:", error);
    process.exit(1);
  }
}

main();
