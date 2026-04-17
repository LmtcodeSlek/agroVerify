import LOCATION_TREE_SEEDED from '../constants/locations';

const splitPath = (value) => {
  if (!value || typeof value !== 'string') return [];
  return value
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean);
};

const getEnvValue = (primaryKey, fallbackKey = '') => {
  const primary = process.env[primaryKey];
  if (primary) return String(primary).trim();
  const fallback = fallbackKey ? process.env[fallbackKey] : '';
  return fallback ? String(fallback).trim() : '';
};

const normalizeOption = (value) => String(value || '').trim().toLowerCase();

const findCaseInsensitiveMatch = (options, value) => {
  const normalizedValue = normalizeOption(value);
  if (!normalizedValue) return '';
  return options.find((option) => normalizeOption(option) === normalizedValue) || '';
};

export const getDistrictLocationTree = (province, district) => {
  const provinceEntry = LOCATION_TREE_SEEDED[String(province || '').trim()];
  if (!provinceEntry) return null;
  return provinceEntry[String(district || '').trim()] || null;
};

export const getProvinceOptions = () => Object.keys(LOCATION_TREE_SEEDED);

export const getDistrictOptions = (province) => {
  const provinceEntry = LOCATION_TREE_SEEDED[String(province || '').trim()];
  return provinceEntry ? Object.keys(provinceEntry) : [];
};

export const getWardOptions = (province, district) => {
  const districtTree = getDistrictLocationTree(province, district);
  return districtTree ? Object.keys(districtTree) : [];
};

export const getVillageOptions = (province, district, ward) => {
  const districtTree = getDistrictLocationTree(province, district);
  if (!districtTree) return [];
  return districtTree[String(ward || '').trim()] || [];
};

export const normalizeOfficerLocation = (officer) => {
  if (!officer) return officer;

  const envProvince = getEnvValue('REACT_APP_OFFICER_PROVINCE', 'OFFICER_PROVINCE');
  const envDistrict = getEnvValue('REACT_APP_OFFICER_DISTRICT', 'OFFICER_DISTRICT');

  const province = (officer.province || envProvince || '').trim();
  const districtInput = (officer.district || envDistrict || '').trim();
  const wardInput = (officer.ward || '').trim();
  const villageInput = (officer.village || '').trim();

  let district = districtInput;
  let ward = wardInput;

  if (province && district && (ward || ward === '')) {
    const wardOptions = getWardOptions(province, district);
    const matchedWard = findCaseInsensitiveMatch(wardOptions, ward || villageInput);
    const nextWard = matchedWard || ward;
    const villages = nextWard ? getVillageOptions(province, district, nextWard) : [];
    const nextVillage = findCaseInsensitiveMatch(villages, villageInput) || villageInput;

    return {
      ...officer,
      province,
      district,
      ward: nextWard,
      village: nextVillage || officer.village || '',
      villages,
      wards: wardOptions,
    };
  }

  const parts = splitPath(districtInput);
  if (parts.length < 2) {
    const wardOptions = getWardOptions(province, district);
    const matchedWard = findCaseInsensitiveMatch(wardOptions, wardInput || villageInput);
    const villages = matchedWard ? getVillageOptions(province, district, matchedWard) : [];
    const nextVillage = findCaseInsensitiveMatch(villages, villageInput) || villageInput;

    return {
      ...officer,
      province,
      district,
      ward: matchedWard || wardInput,
      village: nextVillage || officer.village || '',
      villages,
      wards: wardOptions,
    };
  }

  const derivedProvince = province || parts[0];
  const derivedDistrict = parts[1] || district;
  const derivedWard = ward || (parts.length >= 3 ? parts[2] : '');
  district = derivedDistrict;
  ward = derivedWard;

  const wardOptions = getWardOptions(derivedProvince, derivedDistrict);
  const matchedWard = findCaseInsensitiveMatch(wardOptions, ward || villageInput);
  const villages = matchedWard ? getVillageOptions(derivedProvince, derivedDistrict, matchedWard) : [];
  const nextVillage = findCaseInsensitiveMatch(villages, villageInput) || villageInput;

  return {
    ...officer,
    province: derivedProvince,
    district,
    ward: matchedWard || ward,
    village: nextVillage || officer.village || '',
    villages,
    wards: wardOptions,
  };
};

export const normalizeFarmerLocation = (farmer) => {
  if (!farmer) return farmer;
  const province = (farmer.province || '').trim();
  const district = (farmer.district || '').trim();
  const ward = (farmer.ward || '').trim();
  const village = (farmer.village || '').trim();
  const location = (farmer.location || '').trim();

  if (province && district) {
    return {
      ...farmer,
      village: village || ward || '',
    };
  }

  const locationParts = splitPath(location);
  if (locationParts.length >= 2) {
    return {
      ...farmer,
      province: province || locationParts[0],
      district: district || locationParts[1],
      ward: ward || (locationParts.length >= 3 ? locationParts[2] : ''),
      village: village || (locationParts.length >= 3 ? locationParts[2] : ''),
    };
  }

  const parts = splitPath(district);
  if (parts.length < 2) return farmer;

  return {
    ...farmer,
    province: province || parts[0],
    district: parts[1] || district,
    ward: ward || (parts.length >= 3 ? parts[2] : ''),
    village: village || (parts.length >= 3 ? parts[2] : ''),
  };
};

export const getLocationLabel = ({ province = '', district = '', ward = '', village = '' } = {}) => (
  [province, district, village || ward]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(' / ')
);

export const getReadableLocationName = (farmer) => {
  if (!farmer) return '';

  const explicit = getLocationLabel({
    province: farmer.province,
    district: farmer.district,
    ward: farmer.ward,
    village: farmer.village,
  });

  if (explicit) return explicit;

  const rawLocation = String(farmer.location || '').trim();
  if (!rawLocation) return '';

  return rawLocation
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' / ');
};
