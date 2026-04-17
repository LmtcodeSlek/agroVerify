import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("AgriTrustModule", (m) => {
  const agriTrust = m.contract("AgriTrust");

  return { agriTrust };
});
