import LOCATION_TREE_SEEDED from "../constants/locations";

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function sanitizeLocationPart(value) {
  const text = String(value || "").trim();
  const normalized = normalizeText(text);
  if (!text) return "";
  if (normalized === "unassigned" || normalized === "unknown" || normalized === "—" || normalized === "-") {
    return "";
  }
  return text;
}

function toOptionList(values) {
  return Array.from(new Set((values || []).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
    .map((value) => ({ value, label: value }));
}

function findCaseInsensitiveKey(options, value) {
  const target = normalizeText(value);
  return Object.keys(options || {}).find((option) => normalizeText(option) === target) || "";
}

export function getOfficerAssignment() {
  const province = String(
    process.env.REACT_APP_OFFICER_PROVINCE
      || process.env.OFFICER_PROVINCE
      || "Central"
  ).trim();
  const district = String(
    process.env.REACT_APP_OFFICER_DISTRICT
      || process.env.OFFICER_DISTRICT
      || "Kabwe"
  ).trim();

  return { province, district };
}

export function getDistrictTree(province) {
  const matchedProvince = findCaseInsensitiveKey(LOCATION_TREE_SEEDED, province);
  return matchedProvince ? LOCATION_TREE_SEEDED[matchedProvince] || {} : {};
}

export function getWardTree(province, district) {
  const districtTree = getDistrictTree(province);
  const matchedDistrict = findCaseInsensitiveKey(districtTree, district);
  return matchedDistrict ? districtTree[matchedDistrict] || {} : {};
}

export function getVillagesForWard(province, district, ward) {
  const wardTree = getWardTree(province, district);
  const matchedWard = findCaseInsensitiveKey(wardTree, ward);
  return matchedWard ? [...(wardTree[matchedWard] || [])] : [];
}

export function getOfficerLocationConfig() {
  const assignment = getOfficerAssignment();
  const wardTree = getWardTree(assignment.province, assignment.district);
  const wardOptions = toOptionList(Object.keys(wardTree));
  const villageOptionsByWard = Object.entries(wardTree).reduce((acc, [ward, villages]) => {
    acc[ward] = toOptionList(villages);
    return acc;
  }, {});

  return {
    ...assignment,
    wardOptions,
    villageOptionsByWard,
  };
}

export function findLocationByVillage(village, scope = {}) {
  const villageText = normalizeText(village);
  if (!villageText) return null;

  for (const [province, districts] of Object.entries(LOCATION_TREE_SEEDED)) {
    if (scope.province && normalizeText(scope.province) !== normalizeText(province)) continue;

    for (const [district, wards] of Object.entries(districts || {})) {
      if (scope.district && normalizeText(scope.district) !== normalizeText(district)) continue;

      for (const [ward, villages] of Object.entries(wards || {})) {
        if (scope.ward && normalizeText(scope.ward) !== normalizeText(ward)) continue;

        const matchedVillage = (villages || []).find((item) => normalizeText(item) === villageText);
        if (matchedVillage) {
          return { province, district, ward, village: matchedVillage };
        }

        if (normalizeText(ward) === villageText) {
          return { province, district, ward, village: ward };
        }
      }
    }
  }

  return null;
}

export function resolveLocationSelection(input = {}) {
  const rawProvince = sanitizeLocationPart(input.province);
  const rawDistrict = sanitizeLocationPart(input.district);
  const rawWard = sanitizeLocationPart(input.ward || input.town);
  const rawVillage = sanitizeLocationPart(input.village);
  const rawLocation = String(input.location || "").trim();

  let province = rawProvince;
  let district = rawDistrict;
  let ward = rawWard;
  let village = rawVillage;

  if (!province || !district || !ward || !village) {
    const parts = rawLocation
      .split(/[/,|-]+/)
      .map((part) => sanitizeLocationPart(part))
      .filter(Boolean);

    if (parts.length >= 4) {
      province = province || parts[0];
      district = district || parts[1];
      ward = ward || parts[2];
      village = village || parts[3];
    } else if (parts.length === 3) {
      province = province || parts[0];
      district = district || parts[1];
      village = village || parts[2];
      ward = ward || parts[2];
    } else if (parts.length === 1 && !village) {
      village = parts[0];
    }
  }

  const fromVillage = findLocationByVillage(village || rawLocation, { province, district, ward });
  if (fromVillage) {
    province = province || fromVillage.province;
    district = district || fromVillage.district;
    ward = ward || fromVillage.ward;
    village = village || fromVillage.village;
  }

  if (province && district && ward && !village) {
    const villages = getVillagesForWard(province, district, ward);
    if (villages.length === 1) {
      village = villages[0];
    }
  }

  return {
    province: province || "",
    district: district || "",
    ward: ward || "",
    village: village || "",
  };
}

export function buildLocationString(location = {}) {
  return [location.province, location.district, location.ward, location.village]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(" / ");
}

export function buildHierarchyFromTree(filters = {}) {
  const province = String(filters.province || "").trim();
  const district = String(filters.district || "").trim();
  const town = String(filters.town || filters.ward || "").trim();

  const provinces = province
    ? toOptionList([findCaseInsensitiveKey(LOCATION_TREE_SEEDED, province)].filter(Boolean))
    : toOptionList(Object.keys(LOCATION_TREE_SEEDED));

  const districtTree = province ? getDistrictTree(province) : {};
  const districts = province ? toOptionList(Object.keys(districtTree)) : [];

  const wardTree = province && district ? getWardTree(province, district) : {};
  const towns = province && district ? toOptionList(Object.keys(wardTree)) : [];

  const villages = province && district && town
    ? toOptionList(getVillagesForWard(province, district, town))
    : [];

  return { provinces, districts, towns, villages };
}
