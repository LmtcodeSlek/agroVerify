import "dotenv/config";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { network } from "hardhat";

const { ethers } = await network.connect();
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..");
const blockchainArtifactPath = path.join(repoRoot, "blockchain", "artifacts", "contracts", "AgriTrust.sol", "AgriTrust.json");

async function updateEnvContractAddress(envPath: string, address: string) {
  const source = await readFile(envPath, "utf8");
  const lines = source.split(/\r?\n/);
  let updated = false;
  const nextLines = lines.map((line) => {
    if (line.startsWith("AGRITRUST_CONTRACT_ADDRESS=")) {
      updated = true;
      return `AGRITRUST_CONTRACT_ADDRESS=${address}`;
    }
    if (line.startsWith("REACT_APP_CONTRACT_ADDRESS=")) {
      updated = true;
      return `REACT_APP_CONTRACT_ADDRESS=${address}`;
    }
    if (line.startsWith("VITE_AGRITRUST_CONTRACT_ADDRESS=")) {
      updated = true;
      return `VITE_AGRITRUST_CONTRACT_ADDRESS=${address}`;
    }
    return line;
  });

  const finalLines = [...nextLines];
  if (!source.includes("AGRITRUST_CONTRACT_ADDRESS=")) {
    finalLines.push(`AGRITRUST_CONTRACT_ADDRESS=${address}`);
  }
  if (!source.includes("REACT_APP_CONTRACT_ADDRESS=")) {
    finalLines.push(`REACT_APP_CONTRACT_ADDRESS=${address}`);
  }
  if (!source.includes("VITE_AGRITRUST_CONTRACT_ADDRESS=") && envPath.includes("admin-portal")) {
    finalLines.push(`VITE_AGRITRUST_CONTRACT_ADDRESS=${address}`);
  }

  await writeFile(envPath, `${finalLines.join("\n").trimEnd()}\n`, "utf8");
}

async function pathExists(targetPath: string) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function syncFrontendArtifacts(address: string) {
  const artifact = JSON.parse(await readFile(blockchainArtifactPath, "utf8"));
  const abiPayload = JSON.stringify({ abi: artifact.abi }, null, 2);

  const targets = [
    {
      envPath: path.join(repoRoot, "blockchain", ".env"),
      abiPath: null,
    },
    {
      envPath: path.join(repoRoot, "officer", ".env"),
      abiPath: path.join(repoRoot, "officer", "src", "contracts", "AgroVerify.json"),
    },
    {
      envPath: path.join(repoRoot, "frontend", "admin-portal", ".env"),
      abiPath: path.join(repoRoot, "frontend", "admin-portal", "src", "contracts", "AgriTrust.json"),
    },
  ];

  for (const target of targets) {
    if (!(await pathExists(target.envPath))) {
      continue;
    }

    await updateEnvContractAddress(target.envPath, address);

    if (target.abiPath && (await pathExists(path.dirname(target.abiPath)))) {
      await writeFile(target.abiPath, abiPayload, "utf8");
    }
  }
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const primaryOfficerWalletDefault = "0x8626f6940e2eb28930efb4cef49b2d1f2c9c1199";
  const secondaryOfficerWalletDefault = "0x1bD516949E6dbb85eD83EFd89D855d4C5a6Dd5AB";

  const primaryOfficerWallet = process.env.OFFICER_WALLET ?? primaryOfficerWalletDefault;
  const secondaryOfficerWallet = process.env.OFFICER_WALLET_2 ?? secondaryOfficerWalletDefault;
  const primaryOfficerName = process.env.OFFICER_NAME ?? "Connected MetaMask Officer";
  const secondaryOfficerName = process.env.OFFICER_NAME_2 ?? "Local Test Officer";
  const primaryOfficerProvince = process.env.OFFICER_PROVINCE ?? "Central";
  const primaryOfficerDistrict = process.env.OFFICER_DISTRICT ?? "Kabwe";
  const primaryOfficerWard = process.env.OFFICER_WARD ?? "Makululu";
  const secondaryOfficerProvince = process.env.OFFICER_PROVINCE_2 ?? primaryOfficerProvince;
  const secondaryOfficerDistrict = process.env.OFFICER_DISTRICT_2 ?? primaryOfficerDistrict;
  const secondaryOfficerWard = process.env.OFFICER_WARD_2 ?? primaryOfficerWard;

  const officersToCreate = [
    {
      wallet: primaryOfficerWallet,
      name: primaryOfficerName,
      province: primaryOfficerProvince,
      district: primaryOfficerDistrict,
      ward: primaryOfficerWard,
    },
    {
      wallet: secondaryOfficerWallet,
      name: secondaryOfficerName,
      province: secondaryOfficerProvince,
      district: secondaryOfficerDistrict,
      ward: secondaryOfficerWard,
    },
  ].filter(
    (officer, index, self) =>
      officer.wallet &&
      self.findIndex((candidate) => candidate.wallet.toLowerCase() === officer.wallet.toLowerCase()) === index,
  );

  for (const officer of officersToCreate) {
    if (!ethers.isAddress(officer.wallet)) {
      throw new Error(`Invalid officer wallet address: ${officer.wallet}`);
    }
  }

  // Avoid the well-known default Hardhat nonce-0 contract address (0x5FbDB...),
  // which can be reputation-flagged by wallet security scanners in localhost demos.
  const nonceBumpTx = await deployer.sendTransaction({
    to: deployer.address,
    value: 0n,
  });
  await nonceBumpTx.wait();

  const agriTrust = await ethers.deployContract("AgriTrust");
  await agriTrust.waitForDeployment();
  const address = await agriTrust.getAddress();

  console.log("Deployer:", deployer.address);
  console.log("Nonce bump tx:", nonceBumpTx.hash);
  console.log("AgriTrust deployed:", address);

  for (const officer of officersToCreate) {
    const hasLocationAssignment = Boolean(officer.province && officer.district && officer.ward);
    const createOfficerTx = hasLocationAssignment
      ? await agriTrust["createOfficer(address,string,string,string,string)"](
          officer.wallet,
          officer.name,
          officer.province,
          officer.district,
          officer.ward,
        )
      : await agriTrust["createOfficer(address,string)"](officer.wallet, officer.name);
    await createOfficerTx.wait();
    console.log("Officer authorized:", officer.wallet, `(${officer.name})`);
    if (hasLocationAssignment) {
      console.log("Officer assignment:", `${officer.province} / ${officer.district} / ${officer.ward}`);
    }
    console.log("Officer tx:", createOfficerTx.hash);
  }

  await syncFrontendArtifacts(address);
  console.log("Frontend ABI and contract addresses synced.");
  console.log("AgriTrust deployed and 0x8626... authorized as Officer!");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
