// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract AgriTrust {
    address public owner;
    uint256 public eligibilityDelay;

    enum FarmerStatus {
        Pending,
        Approved,
        Rejected
    }

    struct Officer {
        address wallet;
        string name;
        string province;
        string district;
        string ward;
        bool active;
        bool exists;
        uint256 createdAt;
        uint256 updatedAt;
    }

    struct Farmer {
        string id;
        string name;
        string location;
        string province;
        string district;
        string ward;
        string village;
        FarmerStatus status;
        address registeredBy;
        bool exists;
        uint256 registeredAt;
        uint256 reviewedAt;
        uint256 eligibleDate;
        bool hasCollected;
        uint256 collectedAt;
    }

    struct Allocation {
        string farmerId;
        uint256 quantity;
        address allocatedBy;
        bool exists;
        uint256 allocatedAt;
    }

    struct Distribution {
        string farmerId;
        bool confirmed;
        address confirmedBy;
        uint256 confirmedAt;
        uint256 quantity;
    }

    struct DistributionSchedule {
        uint256 id;
        string province;
        string district;
        string ward;
        uint256 bagsPerFarmer;
        uint256 startTime;
        uint256 endTime;
        bool isActive;
    }

    struct WardAllocationPolicy {
        string province;
        string district;
        string ward;
        uint256 bagsPerFarmer;
        address setBy;
        bool exists;
        uint256 updatedAt;
    }

    struct AuditEntry {
        string action;
        string farmerId;
        address actor;
        uint256 timestamp;
    }

    mapping(address => Officer) private officers;
    address[] private officerWallets;

    mapping(bytes32 => Farmer) private farmers;
    bytes32[] private farmerKeys;

    mapping(bytes32 => Allocation) private allocations;
    mapping(bytes32 => Distribution) private distributions;
    mapping(bytes32 => WardAllocationPolicy) private wardAllocationPolicies;
    mapping(uint256 => DistributionSchedule) public schedules;

    uint256 public scheduleCount;

    AuditEntry[] private auditTrail;

    event OfficerCreated(uint256 timestamp, address wallet, string farmerId, string name);
    event OfficerActivated(uint256 timestamp, address wallet, string farmerId);
    event OfficerDeactivated(uint256 timestamp, address wallet, string farmerId);
    event FarmerRegistered(uint256 timestamp, address wallet, string farmerId, string name, string location);
    event FarmerVerified(uint256 timestamp, address wallet, string farmerId);
    event FarmerRejected(uint256 timestamp, address wallet, string farmerId);
    event FertilizerAllocated(uint256 timestamp, address wallet, string farmerId, uint256 quantity);
    event DistributionConfirmed(uint256 timestamp, address wallet, string farmerId);
    event ScheduleCreated(
        uint256 timestamp,
        uint256 scheduleId,
        string province,
        string district,
        string ward,
        uint256 bagsPerFarmer,
        uint256 startTime,
        uint256 endTime
    );
    event AllocationPolicyApplied(
        uint256 timestamp,
        address wallet,
        string province,
        string district,
        string ward,
        uint256 bagsPerFarmer
    );
    event EligibilityDelayUpdated(uint256 timestamp, uint256 delay);

    modifier onlyOwner() {
        require(msg.sender == owner, "AgriTrust: owner only");
        _;
    }

    modifier onlyActiveOfficer() {
        require(officers[msg.sender].exists, "AgriTrust: officer not found");
        require(officers[msg.sender].active, "AgriTrust: officer inactive");
        _;
    }

    constructor() {
        owner = msg.sender;
        eligibilityDelay = 0;
    }

    function setEligibilityDelay(uint256 delay) external onlyOwner {
        eligibilityDelay = delay;

        _logAction("ELIGIBILITY_DELAY_UPDATED", "");
        emit EligibilityDelayUpdated(block.timestamp, delay);
    }

    function createOfficer(address wallet, string calldata name) external onlyOwner {
        _createOfficer(wallet, name, "", "", "");
    }

    function createOfficer(
        address wallet,
        string calldata name,
        string calldata province,
        string calldata district,
        string calldata ward
    ) external onlyOwner {
        _createOfficer(wallet, name, province, district, ward);
    }

    function activateOfficer(address wallet) external onlyOwner {
        Officer storage officer = officers[wallet];
        require(officer.exists, "AgriTrust: officer not found");
        require(!officer.active, "AgriTrust: officer already active");

        officer.active = true;
        officer.updatedAt = block.timestamp;

        _logAction("OFFICER_ACTIVATED", "");
        emit OfficerActivated(block.timestamp, wallet, "");
    }

    function deactivateOfficer(address wallet) external onlyOwner {
        Officer storage officer = officers[wallet];
        require(officer.exists, "AgriTrust: officer not found");
        require(officer.active, "AgriTrust: officer already inactive");

        officer.active = false;
        officer.updatedAt = block.timestamp;

        _logAction("OFFICER_DEACTIVATED", "");
        emit OfficerDeactivated(block.timestamp, wallet, "");
    }

    function registerFarmer(
        string calldata farmerId,
        string calldata name,
        string calldata locationOrVillage
    ) external onlyActiveOfficer {
        Officer memory officer = officers[msg.sender];

        if (_officerHasLockedAssignment(officer)) {
            _registerFarmerWithAssignment(farmerId, name, officer, locationOrVillage);
            return;
        }

        _registerLegacyFarmer(farmerId, name, locationOrVillage);
    }

    function registerFarmerWithVillage(
        string calldata farmerId,
        string calldata name,
        string calldata village
    ) external onlyActiveOfficer {
        Officer memory officer = officers[msg.sender];
        require(_officerHasLockedAssignment(officer), "AgriTrust: officer location not assigned");

        _registerFarmerWithAssignment(farmerId, name, officer, village);
    }

    function verifyFarmer(string calldata farmerId) external onlyOwner {
        bytes32 key = _farmerKey(farmerId);
        Farmer storage farmer = farmers[key];
        require(farmer.exists, "AgriTrust: farmer not found");
        require(farmer.status != FarmerStatus.Approved, "AgriTrust: farmer already verified");
        require(farmer.status != FarmerStatus.Rejected, "AgriTrust: farmer already rejected");

        farmer.status = FarmerStatus.Approved;
        farmer.reviewedAt = block.timestamp;

        _logAction("FARMER_VERIFIED", farmerId);
        emit FarmerVerified(block.timestamp, msg.sender, farmerId);
    }

    function rejectFarmer(string calldata farmerId) external onlyOwner {
        bytes32 key = _farmerKey(farmerId);
        Farmer storage farmer = farmers[key];
        require(farmer.exists, "AgriTrust: farmer not found");
        require(farmer.status == FarmerStatus.Pending, "AgriTrust: farmer not pending");

        farmer.status = FarmerStatus.Rejected;
        farmer.reviewedAt = block.timestamp;

        _logAction("FARMER_REJECTED", farmerId);
        emit FarmerRejected(block.timestamp, msg.sender, farmerId);
    }

    function allocateFertilizer(string calldata farmerId, uint256 quantity) external onlyOwner {
        bytes32 key = _farmerKey(farmerId);
        Farmer storage farmer = farmers[key];
        require(farmer.exists, "AgriTrust: farmer not found");
        require(farmer.status == FarmerStatus.Approved, "AgriTrust: farmer not verified");
        require(quantity > 0, "AgriTrust: quantity must be > 0");

        allocations[key] = Allocation({
            farmerId: farmerId,
            quantity: quantity,
            allocatedBy: msg.sender,
            exists: true,
            allocatedAt: block.timestamp
        });

        _logAction("FERTILIZER_ALLOCATED", farmerId);
        emit FertilizerAllocated(block.timestamp, msg.sender, farmerId, quantity);
    }

    function applyAllocationPolicy(
        string calldata province,
        string calldata district,
        string calldata ward,
        uint256 bagsPerFarmer
    ) external onlyOwner {
        require(bytes(province).length > 0, "AgriTrust: province required");
        require(bytes(district).length > 0, "AgriTrust: district required");
        require(bytes(ward).length > 0, "AgriTrust: ward required");

        bytes32 key = _wardPolicyKey(province, district, ward);
        wardAllocationPolicies[key] = WardAllocationPolicy({
            province: province,
            district: district,
            ward: ward,
            bagsPerFarmer: bagsPerFarmer,
            setBy: msg.sender,
            exists: true,
            updatedAt: block.timestamp
        });

        _logAction("ALLOCATION_POLICY_APPLIED", "");
        emit AllocationPolicyApplied(block.timestamp, msg.sender, province, district, ward, bagsPerFarmer);
    }

    function createSchedule(
        string calldata province,
        string calldata district,
        string calldata ward,
        uint256 bagsPerFarmer,
        uint256 durationDays
    ) external onlyOwner {
        require(bytes(province).length > 0, "AgriTrust: province required");
        require(bytes(district).length > 0, "AgriTrust: district required");
        require(bytes(ward).length > 0, "AgriTrust: ward required");
        require(bagsPerFarmer > 0, "AgriTrust: bags must be > 0");
        require(durationDays > 0, "AgriTrust: duration required");

        scheduleCount += 1;
        uint256 startTime = block.timestamp;
        uint256 endTime = block.timestamp + (durationDays * 1 days);

        schedules[scheduleCount] = DistributionSchedule({
            id: scheduleCount,
            province: province,
            district: district,
            ward: ward,
            bagsPerFarmer: bagsPerFarmer,
            startTime: startTime,
            endTime: endTime,
            isActive: true
        });

        _logAction("SCHEDULE_CREATED", "");
        emit ScheduleCreated(
            block.timestamp,
            scheduleCount,
            province,
            district,
            ward,
            bagsPerFarmer,
            startTime,
            endTime
        );
    }

    function confirmDistribution(string calldata farmerId) external onlyActiveOfficer {
        bytes32 key = _farmerKey(farmerId);
        Farmer storage farmer = farmers[key];
        Allocation storage allocation = allocations[key];
        Distribution storage distribution = distributions[key];
        Officer memory officer = officers[msg.sender];

        require(farmer.exists, "AgriTrust: farmer not found");
        require(farmer.status == FarmerStatus.Approved, "AgriTrust: farmer not verified");
        require(block.timestamp >= farmer.eligibleDate, "AgriTrust: farmer not yet eligible");
        require(!farmer.hasCollected, "AgriTrust: farmer already collected");
        require(!distribution.confirmed, "AgriTrust: distribution already confirmed");
        require(_officerMatchesFarmer(officer, farmer), "AgriTrust: officer location mismatch");

        uint256 quantity = allocation.exists ? allocation.quantity : _bagsPerFarmerForFarmer(farmer);
        require(quantity > 0, "AgriTrust: allocation not found");

        distributions[key] = Distribution({
            farmerId: farmerId,
            confirmed: true,
            confirmedBy: msg.sender,
            confirmedAt: block.timestamp,
            quantity: quantity
        });

        farmer.hasCollected = true;
        farmer.collectedAt = block.timestamp;

        _logAction("DISTRIBUTION_CONFIRMED", farmerId);
        emit DistributionConfirmed(block.timestamp, msg.sender, farmerId);
    }

    function isOfficerActive(address wallet) external view returns (bool) {
        return officers[wallet].exists && officers[wallet].active;
    }

    function getOfficer(address wallet)
        external
        view
        returns (
            address,
            string memory,
            bool,
            bool,
            uint256,
            uint256
        )
    {
        Officer memory officer = officers[wallet];
        require(officer.exists, "AgriTrust: officer not found");
        return (
            officer.wallet,
            officer.name,
            officer.active,
            officer.exists,
            officer.createdAt,
            officer.updatedAt
        );
    }

    function getOfficerDetails(address wallet)
        external
        view
        returns (
            address,
            string memory,
            string memory,
            string memory,
            string memory,
            bool,
            bool,
            uint256,
            uint256
        )
    {
        Officer memory officer = officers[wallet];
        require(officer.exists, "AgriTrust: officer not found");
        return (
            officer.wallet,
            officer.name,
            officer.province,
            officer.district,
            officer.ward,
            officer.active,
            officer.exists,
            officer.createdAt,
            officer.updatedAt
        );
    }

    function getOfficerCount() external view returns (uint256) {
        return officerWallets.length;
    }

    function getOfficerWalletAt(uint256 index) external view returns (address) {
        require(index < officerWallets.length, "AgriTrust: officer index out of bounds");
        return officerWallets[index];
    }

    function getFarmer(string calldata farmerId)
        external
        view
        returns (
            string memory,
            string memory,
            string memory,
            FarmerStatus,
            address,
            bool,
            uint256,
            uint256
        )
    {
        Farmer memory farmer = farmers[_farmerKey(farmerId)];
        require(farmer.exists, "AgriTrust: farmer not found");
        return (
            farmer.id,
            farmer.name,
            farmer.location,
            farmer.status,
            farmer.registeredBy,
            farmer.exists,
            farmer.registeredAt,
            farmer.reviewedAt
        );
    }

    function getFarmerDetails(string calldata farmerId)
        external
        view
        returns (
            string memory,
            string memory,
            string memory,
            string memory,
            string memory,
            string memory,
            string memory,
            FarmerStatus,
            address,
            bool,
            uint256,
            uint256,
            uint256,
            bool,
            uint256
        )
    {
        Farmer memory farmer = farmers[_farmerKey(farmerId)];
        require(farmer.exists, "AgriTrust: farmer not found");
        return (
            farmer.id,
            farmer.name,
            farmer.location,
            farmer.province,
            farmer.district,
            farmer.ward,
            farmer.village,
            farmer.status,
            farmer.registeredBy,
            farmer.exists,
            farmer.registeredAt,
            farmer.reviewedAt,
            farmer.eligibleDate,
            farmer.hasCollected,
            farmer.collectedAt
        );
    }

    function getAllFarmers() external view returns (Farmer[] memory) {
        Farmer[] memory allFarmers = new Farmer[](farmerKeys.length);

        for (uint256 i = 0; i < farmerKeys.length; i++) {
            allFarmers[i] = farmers[farmerKeys[i]];
        }

        return allFarmers;
    }

    function getFarmerCount() external view returns (uint256) {
        return farmerKeys.length;
    }

    function getFarmerIdAt(uint256 index) external view returns (string memory) {
        require(index < farmerKeys.length, "AgriTrust: farmer index out of bounds");
        return farmers[farmerKeys[index]].id;
    }

    function isFarmerVerified(string calldata farmerId) external view returns (bool) {
        Farmer memory farmer = farmers[_farmerKey(farmerId)];
        return farmer.exists && farmer.status == FarmerStatus.Approved;
    }

    function getAllocation(string calldata farmerId)
        external
        view
        returns (
            string memory,
            uint256,
            address,
            bool,
            uint256
        )
    {
        Allocation memory allocation = allocations[_farmerKey(farmerId)];
        require(allocation.exists, "AgriTrust: allocation not found");
        return (
            allocation.farmerId,
            allocation.quantity,
            allocation.allocatedBy,
            allocation.exists,
            allocation.allocatedAt
        );
    }

    function getAllocationPolicy(
        string calldata province,
        string calldata district,
        string calldata ward
    )
        external
        view
        returns (
            string memory,
            string memory,
            string memory,
            uint256,
            address,
            bool,
            uint256
        )
    {
        WardAllocationPolicy memory policy = wardAllocationPolicies[_wardPolicyKey(province, district, ward)];
        require(policy.exists, "AgriTrust: policy not found");
        return (
            policy.province,
            policy.district,
            policy.ward,
            policy.bagsPerFarmer,
            policy.setBy,
            policy.exists,
            policy.updatedAt
        );
    }

    function getDistribution(string calldata farmerId)
        external
        view
        returns (
            string memory,
            bool,
            address,
            uint256
        )
    {
        Distribution memory distribution = distributions[_farmerKey(farmerId)];
        require(distribution.confirmed, "AgriTrust: distribution not confirmed");
        return (
            distribution.farmerId,
            distribution.confirmed,
            distribution.confirmedBy,
            distribution.confirmedAt
        );
    }

    function getDistributionDetails(string calldata farmerId)
        external
        view
        returns (
            string memory,
            bool,
            address,
            uint256,
            uint256
        )
    {
        Distribution memory distribution = distributions[_farmerKey(farmerId)];
        require(distribution.confirmed, "AgriTrust: distribution not confirmed");
        return (
            distribution.farmerId,
            distribution.confirmed,
            distribution.confirmedBy,
            distribution.confirmedAt,
            distribution.quantity
        );
    }

    function getAuditCount() external view returns (uint256) {
        return auditTrail.length;
    }

    function getAuditEntry(uint256 index)
        external
        view
        returns (
            string memory,
            string memory,
            address,
            uint256
        )
    {
        require(index < auditTrail.length, "AgriTrust: audit index out of bounds");
        AuditEntry memory entry = auditTrail[index];
        return (entry.action, entry.farmerId, entry.actor, entry.timestamp);
    }

    function _createOfficer(
        address wallet,
        string memory name,
        string memory province,
        string memory district,
        string memory ward
    ) internal {
        require(wallet != address(0), "AgriTrust: invalid wallet");
        require(bytes(name).length > 0, "AgriTrust: name required");
        require(!officers[wallet].exists, "AgriTrust: officer exists");

        officers[wallet] = Officer({
            wallet: wallet,
            name: name,
            province: province,
            district: district,
            ward: ward,
            active: true,
            exists: true,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });
        officerWallets.push(wallet);

        _logAction("OFFICER_CREATED", "");
        emit OfficerCreated(block.timestamp, wallet, "", name);
    }

    function _registerLegacyFarmer(
        string calldata farmerId,
        string calldata name,
        string calldata location
    ) internal {
        bytes32 key = _farmerKey(farmerId);
        require(!farmers[key].exists, "AgriTrust: farmer already registered");
        require(bytes(name).length > 0, "AgriTrust: farmer name required");
        require(bytes(location).length > 0, "AgriTrust: farmer location required");

        farmers[key] = Farmer({
            id: farmerId,
            name: name,
            location: location,
            province: "",
            district: "",
            ward: "",
            village: "",
            status: FarmerStatus.Pending,
            registeredBy: msg.sender,
            exists: true,
            registeredAt: block.timestamp,
            reviewedAt: 0,
            eligibleDate: block.timestamp + eligibilityDelay,
            hasCollected: false,
            collectedAt: 0
        });
        farmerKeys.push(key);

        _logAction("FARMER_REGISTERED", farmerId);
        emit FarmerRegistered(block.timestamp, msg.sender, farmerId, name, location);
    }

    function _registerFarmerWithAssignment(
        string calldata farmerId,
        string calldata name,
        Officer memory officer,
        string calldata village
    ) internal {
        bytes32 key = _farmerKey(farmerId);
        require(!farmers[key].exists, "AgriTrust: farmer already registered");
        require(bytes(name).length > 0, "AgriTrust: farmer name required");
        require(bytes(village).length > 0, "AgriTrust: village required");

        string memory location = _composeLocation(
            officer.province,
            officer.district,
            officer.ward,
            village
        );

        farmers[key] = Farmer({
            id: farmerId,
            name: name,
            location: location,
            province: officer.province,
            district: officer.district,
            ward: officer.ward,
            village: village,
            status: FarmerStatus.Pending,
            registeredBy: msg.sender,
            exists: true,
            registeredAt: block.timestamp,
            reviewedAt: 0,
            eligibleDate: block.timestamp + eligibilityDelay,
            hasCollected: false,
            collectedAt: 0
        });
        farmerKeys.push(key);

        _logAction("FARMER_REGISTERED", farmerId);
        emit FarmerRegistered(block.timestamp, msg.sender, farmerId, name, location);
    }

    function _officerHasLockedAssignment(Officer memory officer) internal pure returns (bool) {
        return
            bytes(officer.province).length > 0 &&
            bytes(officer.district).length > 0 &&
            bytes(officer.ward).length > 0;
    }

    function _officerMatchesFarmer(Officer memory officer, Farmer storage farmer) internal view returns (bool) {
        if (!_officerHasLockedAssignment(officer)) {
            return true;
        }

        return
            _sameString(officer.province, farmer.province) &&
            _sameString(officer.district, farmer.district) &&
            _sameString(officer.ward, farmer.ward);
    }

    function _bagsPerFarmerForFarmer(Farmer storage farmer) internal view returns (uint256) {
        if (
            bytes(farmer.province).length == 0 ||
            bytes(farmer.district).length == 0 ||
            bytes(farmer.ward).length == 0
        ) {
            return 0;
        }

        WardAllocationPolicy memory policy = wardAllocationPolicies[
            _wardPolicyKey(farmer.province, farmer.district, farmer.ward)
        ];

        if (policy.exists && policy.bagsPerFarmer > 0) {
            return policy.bagsPerFarmer;
        }

        for (uint256 i = 1; i <= scheduleCount; i++) {
            DistributionSchedule storage schedule = schedules[i];
            if (
                schedule.isActive &&
                block.timestamp >= schedule.startTime &&
                block.timestamp <= schedule.endTime &&
                _sameString(schedule.province, farmer.province) &&
                _sameString(schedule.district, farmer.district) &&
                _sameString(schedule.ward, farmer.ward)
            ) {
                return schedule.bagsPerFarmer;
            }
        }

        return 0;
    }

    function _farmerKey(string memory farmerId) internal pure returns (bytes32) {
        require(bytes(farmerId).length > 0, "AgriTrust: farmerId required");
        return keccak256(abi.encodePacked(farmerId));
    }

    function _wardPolicyKey(
        string memory province,
        string memory district,
        string memory ward
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(province, "|", district, "|", ward));
    }

    function _sameString(string memory a, string memory b) internal pure returns (bool) {
        return keccak256(bytes(a)) == keccak256(bytes(b));
    }

    function _composeLocation(
        string memory province,
        string memory district,
        string memory ward,
        string memory village
    ) internal pure returns (string memory) {
        return string(abi.encodePacked(province, " / ", district, " / ", ward, " / ", village));
    }

    function _logAction(string memory action, string memory farmerId) internal {
        auditTrail.push(
            AuditEntry({
                action: action,
                farmerId: farmerId,
                actor: msg.sender,
                timestamp: block.timestamp
            })
        );
    }
}
