import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("AgriTrust", function () {
  async function deployFixture() {
    const [owner, officerWallet, secondOfficerWallet, outsider] = await ethers.getSigners();
    const agriTrust = await ethers.deployContract("AgriTrust");

    return {
      agriTrust,
      owner,
      officerWallet,
      secondOfficerWallet,
      outsider,
      farmerId: "NRC-001",
      farmerName: "Alice Banda",
      village: "Mwanachingwala",
      province: "Central",
      district: "Kabwe",
      ward: "Makululu",
    };
  }

  async function increaseTime(seconds: number) {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine", []);
  }

  it("only admin can create officer", async function () {
    const { agriTrust, officerWallet, outsider } = await deployFixture();

    await expect(
      agriTrust
        .connect(outsider)["createOfficer(address,string,string,string,string)"](
          officerWallet.address,
          "Officer One",
          "Central",
          "Kabwe",
          "Makululu",
        ),
    ).to.be.revertedWith("AgriTrust: owner only");
  });

  it("stores officer assignment and supports immediate ward policy-based collection", async function () {
    const { agriTrust, owner, officerWallet, farmerId, farmerName, village, province, district, ward } =
      await deployFixture();

    await expect(
      agriTrust["createOfficer(address,string,string,string,string)"](
        officerWallet.address,
        "Officer One",
        province,
        district,
        ward,
      ),
    ).to.emit(agriTrust, "OfficerCreated");

    const officer = await agriTrust.getOfficerDetails(officerWallet.address);
    expect(officer[2]).to.equal(province);
    expect(officer[3]).to.equal(district);
    expect(officer[4]).to.equal(ward);

    await expect(agriTrust.connect(officerWallet).registerFarmerWithVillage(farmerId, farmerName, village))
      .to.emit(agriTrust, "FarmerRegistered");

    const farmer = await agriTrust.getFarmerDetails(farmerId);
    expect(farmer[2]).to.equal(`${province} / ${district} / ${ward} / ${village}`);
    expect(farmer[3]).to.equal(province);
    expect(farmer[4]).to.equal(district);
    expect(farmer[5]).to.equal(ward);
    expect(farmer[6]).to.equal(village);
    expect(farmer[13]).to.equal(false);

    await expect(agriTrust.connect(owner).verifyFarmer(farmerId)).to.emit(agriTrust, "FarmerVerified");

    await expect(agriTrust.connect(owner).applyAllocationPolicy(province, district, ward, 3n))
      .to.emit(agriTrust, "AllocationPolicyApplied");

    const policy = await agriTrust.getAllocationPolicy(province, district, ward);
    expect(policy[3]).to.equal(3n);

    await expect(agriTrust.connect(officerWallet).confirmDistribution(farmerId))
      .to.emit(agriTrust, "DistributionConfirmed");

    const updatedFarmer = await agriTrust.getFarmerDetails(farmerId);
    expect(updatedFarmer[13]).to.equal(true);

    const distribution = await agriTrust.getDistributionDetails(farmerId);
    expect(distribution[1]).to.equal(true);
    expect(distribution[4]).to.equal(3n);

    const allFarmers = await agriTrust.getAllFarmers();
    expect(allFarmers).to.have.lengthOf(1);
    expect(allFarmers[0].ward).to.equal(ward);
    expect(allFarmers[0].village).to.equal(village);

    expect(await agriTrust.getAuditCount()).to.equal(5n);
  });

  it("allows owners to configure an eligibility delay when delayed collection is required", async function () {
    const { agriTrust, owner, officerWallet, farmerId, farmerName, village, province, district, ward } =
      await deployFixture();

    await agriTrust["createOfficer(address,string,string,string,string)"](
      officerWallet.address,
      "Officer One",
      province,
      district,
      ward,
    );
    await agriTrust.connect(officerWallet).registerFarmerWithVillage(farmerId, farmerName, village);
    await agriTrust.connect(owner).verifyFarmer(farmerId);
    await agriTrust.connect(owner).applyAllocationPolicy(province, district, ward, 3n);
    await expect(agriTrust.connect(owner).setEligibilityDelay(90n * 24n * 60n * 60n))
      .to.emit(agriTrust, "EligibilityDelayUpdated");

    const delayedFarmerId = "NRC-002";
    await agriTrust.connect(officerWallet).registerFarmerWithVillage(delayedFarmerId, "Bob Banda", village);

    await expect(agriTrust.connect(owner).verifyFarmer(delayedFarmerId)).to.emit(agriTrust, "FarmerVerified");
    await expect(agriTrust.connect(officerWallet).confirmDistribution(delayedFarmerId))
      .to.be.revertedWith("AgriTrust: farmer not yet eligible");

    await increaseTime(90 * 24 * 60 * 60 + 1);

    await expect(agriTrust.connect(officerWallet).confirmDistribution(delayedFarmerId))
      .to.emit(agriTrust, "DistributionConfirmed");
  });

  it("creates on-chain distribution schedules for admin dashboard reads", async function () {
    const { agriTrust, owner, province, district, ward } = await deployFixture();

    await expect(agriTrust.connect(owner).createSchedule(province, district, ward, 3n, 14n))
      .to.emit(agriTrust, "ScheduleCreated");

    expect(await agriTrust.scheduleCount()).to.equal(1n);

    const schedule = await agriTrust.schedules(1n);
    expect(schedule.id).to.equal(1n);
    expect(schedule.province).to.equal(province);
    expect(schedule.district).to.equal(district);
    expect(schedule.ward).to.equal(ward);
    expect(schedule.bagsPerFarmer).to.equal(3n);
    expect(schedule.endTime).to.be.greaterThan(schedule.startTime);
    expect(schedule.isActive).to.equal(true);
  });

  it("supports schedule-based collection without a separate ward policy", async function () {
    const { agriTrust, owner, officerWallet, farmerId, farmerName, village, province, district, ward } =
      await deployFixture();

    await agriTrust["createOfficer(address,string,string,string,string)"](
      officerWallet.address,
      "Officer One",
      province,
      district,
      ward,
    );
    await agriTrust.connect(officerWallet).registerFarmerWithVillage(farmerId, farmerName, village);
    await agriTrust.connect(owner).verifyFarmer(farmerId);
    await agriTrust.connect(owner).createSchedule(province, district, ward, 5n, 14n);

    await expect(agriTrust.connect(officerWallet).confirmDistribution(farmerId))
      .to.emit(agriTrust, "DistributionConfirmed");

    const distribution = await agriTrust.getDistributionDetails(farmerId);
    expect(distribution[4]).to.equal(5n);
  });

  it("prevents duplicate farmer registration", async function () {
    const { agriTrust, officerWallet, farmerId, farmerName, village, province, district, ward } = await deployFixture();

    await agriTrust["createOfficer(address,string,string,string,string)"](
      officerWallet.address,
      "Officer One",
      province,
      district,
      ward,
    );
    await agriTrust.connect(officerWallet).registerFarmerWithVillage(farmerId, farmerName, village);

    await expect(agriTrust.connect(officerWallet).registerFarmerWithVillage(farmerId, farmerName, village))
      .to.be.revertedWith("AgriTrust: farmer already registered");
  });

  it("requires an active officer for farmer registration", async function () {
    const { agriTrust, officerWallet, farmerId, farmerName, village, province, district, ward } = await deployFixture();

    await agriTrust["createOfficer(address,string,string,string,string)"](
      officerWallet.address,
      "Officer One",
      province,
      district,
      ward,
    );
    await agriTrust.deactivateOfficer(officerWallet.address);

    await expect(agriTrust.connect(officerWallet).registerFarmerWithVillage(farmerId, farmerName, village))
      .to.be.revertedWith("AgriTrust: officer inactive");
  });

  it("prevents collection when the officer assignment does not match the farmer location", async function () {
    const {
      agriTrust,
      owner,
      officerWallet,
      secondOfficerWallet,
      farmerId,
      farmerName,
      village,
      province,
      district,
      ward,
    } = await deployFixture();

    await agriTrust["createOfficer(address,string,string,string,string)"](
      officerWallet.address,
      "Officer One",
      province,
      district,
      ward,
    );
    await agriTrust["createOfficer(address,string,string,string,string)"](
      secondOfficerWallet.address,
      "Officer Two",
      "Lusaka",
      "Lusaka",
      "Kanyama",
    );

    await agriTrust.connect(officerWallet).registerFarmerWithVillage(farmerId, farmerName, village);
    await agriTrust.connect(owner).verifyFarmer(farmerId);
    await agriTrust.connect(owner).applyAllocationPolicy(province, district, ward, 4n);

    await expect(agriTrust.connect(secondOfficerWallet).confirmDistribution(farmerId))
      .to.be.revertedWith("AgriTrust: officer location mismatch");
  });

  it("prevents double collection", async function () {
    const { agriTrust, owner, officerWallet, farmerId, farmerName, village, province, district, ward } =
      await deployFixture();

    await agriTrust["createOfficer(address,string,string,string,string)"](
      officerWallet.address,
      "Officer One",
      province,
      district,
      ward,
    );
    await agriTrust.connect(officerWallet).registerFarmerWithVillage(farmerId, farmerName, village);
    await agriTrust.connect(owner).verifyFarmer(farmerId);
    await agriTrust.connect(owner).applyAllocationPolicy(province, district, ward, 2n);

    await agriTrust.connect(officerWallet).confirmDistribution(farmerId);

    await expect(agriTrust.connect(officerWallet).confirmDistribution(farmerId))
      .to.be.revertedWith("AgriTrust: farmer already collected");
  });

  it("supports the legacy per-farmer allocation flow for unassigned officers", async function () {
    const { agriTrust, owner, officerWallet } = await deployFixture();
    const farmerId = "FARMER-LEGACY-1";
    const farmerName = "Legacy Farmer";
    const farmerLocation = "Central / Kabwe / Mukobeko";

    await agriTrust.createOfficer(officerWallet.address, "Officer One");
    await agriTrust.connect(officerWallet).registerFarmer(farmerId, farmerName, farmerLocation);
    await agriTrust.connect(owner).verifyFarmer(farmerId);
    await agriTrust.connect(owner).allocateFertilizer(farmerId, 12n);

    await expect(agriTrust.connect(officerWallet).confirmDistribution(farmerId))
      .to.emit(agriTrust, "DistributionConfirmed");

    const farmer = await agriTrust.getFarmer(farmerId);
    expect(farmer[2]).to.equal(farmerLocation);

    const allocation = await agriTrust.getAllocation(farmerId);
    expect(allocation[1]).to.equal(12n);
  });
});
