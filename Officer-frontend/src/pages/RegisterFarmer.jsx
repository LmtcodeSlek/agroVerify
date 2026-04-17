import React, { useEffect, useMemo, useRef, useState } from 'react';
import Topbar from '../components/Topbar';
import useContract from '../hooks/useContract';
import useWallet from '../hooks/useWallet';
import { getProvinceOptions, getVillageOptions, getWardOptions } from '../utils/location';

const RegisterFarmer = () => {
  const { officer } = useWallet();
  const { registerFarmer, getFarmers } = useContract();
  const digitsOnly = (value) => (value || '').replace(/\D+/g, '');
  const envProvince = process.env.REACT_APP_OFFICER_PROVINCE || '';
  const envDistrict = process.env.REACT_APP_OFFICER_DISTRICT || '';
  const provinceOptions = useMemo(() => getProvinceOptions(), []);
  const initialForm = {
    name: '',
    nrc: '',
    phone: '',
    ward: officer?.ward || '',
    village: officer?.village || '',
    farmSize: '',
    crop: 'Maize',
  };
  const [form, setForm] = useState(initialForm);
  const [tx, setTx] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const submitGuardRef = useRef(false);
  const [formError, setFormError] = useState('');
  const [successNote, setSuccessNote] = useState('');

  const effectiveProvince = officer?.province || envProvince || provinceOptions[0] || '';
  const effectiveDistrict = officer?.district || envDistrict || '';
  const normalizedNrc = useMemo(() => (form.nrc || '').trim().toLowerCase(), [form.nrc]);
  const normalizedName = useMemo(() => (form.name || '').trim().toLowerCase(), [form.name]);
  const normalizedPhone = useMemo(() => (form.phone || '').trim().toLowerCase(), [form.phone]);
  const normalizedVillage = useMemo(() => (form.village || '').trim().toLowerCase(), [form.village]);
  const wardOptions = useMemo(() => getWardOptions(effectiveProvince, effectiveDistrict), [effectiveDistrict, effectiveProvince]);
  const isWardLocked = Boolean(officer?.ward);
  const selectedWard = form.ward || officer?.ward || '';
  const villageOptions = useMemo(
    () => getVillageOptions(effectiveProvince, effectiveDistrict, selectedWard),
    [effectiveDistrict, effectiveProvince, selectedWard],
  );

  useEffect(() => {
    setForm((prev) => {
      const nextWard = isWardLocked ? (officer?.ward || '') : (prev.ward || (wardOptions.length === 1 ? wardOptions[0] : ''));
      const nextVillageOptions = getVillageOptions(effectiveProvince, effectiveDistrict, nextWard);
      const preferredVillage = (
        nextVillageOptions.includes(prev.village)
          ? prev.village
          : (officer?.village && nextVillageOptions.includes(officer.village) ? officer.village : '')
      );

      if (prev.ward === nextWard && prev.village === preferredVillage) {
        return prev;
      }

      return {
        ...prev,
        ward: nextWard,
        village: preferredVillage,
      };
    });
  }, [effectiveDistrict, effectiveProvince, isWardLocked, officer?.village, officer?.ward, wardOptions]);

  const isDuplicate = useMemo(() => {
    const farmers = getFarmers();
    if (normalizedNrc) {
      return farmers.some((farmer) => (farmer.nrc || '').trim().toLowerCase() === normalizedNrc);
    }
    if (!normalizedName || !normalizedVillage) return false;
    return farmers.some((farmer) => {
      const sameName = (farmer.name || '').trim().toLowerCase() === normalizedName;
      const sameVillage = (farmer.village || '').trim().toLowerCase() === normalizedVillage;
      if (!sameName || !sameVillage) return false;
      if (normalizedPhone) {
        return (farmer.phone || '').trim().toLowerCase() === normalizedPhone;
      }
      return true;
    });
  }, [getFarmers, normalizedName, normalizedNrc, normalizedPhone, normalizedVillage]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    if (name === 'phone' || name === 'nrc') {
      setForm((prev) => ({ ...prev, [name]: digitsOnly(value) }));
      return;
    }
    if (name === 'ward') {
      setForm((prev) => ({ ...prev, ward: value, village: '' }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting || submitGuardRef.current) return;
    setFormError('');
    setSuccessNote('');
    if (isDuplicate) {
      setFormError('This farmer appears to be already registered (same NRC or details). Please check the farmer list.');
      return;
    }
    setSubmitting(true);
    submitGuardRef.current = true;
    try {
      const result = await registerFarmer({
        ...form,
        province: effectiveProvince,
        district: effectiveDistrict,
        farmSize: Number(form.farmSize || 0),
      });
      setTx(result);
      setSuccessNote('Registration submitted successfully.');
    } catch (error) {
      const detail = error?.response?.data?.detail;
      const validationMessage = Array.isArray(detail)
        ? detail.map((item) => item?.msg).filter(Boolean).join('; ')
        : '';
      const message = typeof detail === 'string'
        ? detail
        : (validationMessage || error?.message || 'Unable to register farmer. Please try again.');
      setFormError(message);
    } finally {
      setSubmitting(false);
      submitGuardRef.current = false;
    }
  };

  const handleClear = () => {
    setForm({
      ...initialForm,
      ward: isWardLocked ? (officer?.ward || '') : '',
      village: '',
    });
  };

  return (
    <div className="scroll-content">
      <Topbar title="Register Farmer" subtitle="Fill all fields carefully" />

      <form onSubmit={handleSubmit}>
        <div className="card">
          <div className="form-section-title">Personal Information</div>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input className="form-input" name="name" value={form.name} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label">NRC Number *</label>
            <input
              className="form-input mono"
              name="nrc"
              value={form.nrc}
              onChange={handleChange}
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input
              className="form-input"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="tel"
            />
          </div>
        </div>

        <div className="card">
          <div className="form-section-title">Location (Auto-Assigned)</div>
          <div className="lock-banner">Province, District & Ward are locked to your assignment. You cannot change them.</div>
          <div className="status-note">
            Seeded tree: {effectiveProvince || 'No province'} / {effectiveDistrict || 'No district'} / {wardOptions.length} wards
          </div>
          <div className="form-group">
            <label className="form-label">Province</label>
            <input className="form-input locked" value={effectiveProvince} readOnly />
            <div className="lock-note">Locked to your assignment</div>
          </div>
          <div className="form-group">
            <label className="form-label">District</label>
            <input className="form-input locked" value={effectiveDistrict} readOnly />
            <div className="lock-note">Locked to your assignment</div>
          </div>
          <div className="form-group">
            <label className="form-label">Town / Ward *</label>
            {isWardLocked ? (
              <>
                <input className="form-input locked" value={officer?.ward || ''} readOnly />
                <div className="lock-note">Locked to your assignment</div>
              </>
            ) : wardOptions.length ? (
              <select className="form-input" name="ward" value={form.ward} onChange={handleChange} required>
                <option value="">Select Ward</option>
                {wardOptions.map((ward) => (
                  <option key={ward} value={ward}>{ward}</option>
                ))}
              </select>
            ) : (
              <>
                <input className="form-input locked" value="" readOnly />
                <div className="lock-note">No seeded wards found for this district yet.</div>
              </>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Village *</label>
            {villageOptions.length ? (
              <select className="form-input" name="village" value={form.village} onChange={handleChange} required>
                <option value="">Select Village</option>
                {villageOptions.map((village) => (
                  <option key={village} value={village}>{village}</option>
                ))}
              </select>
            ) : (
              <input
                className="form-input"
                name="village"
                value={form.village}
                onChange={handleChange}
                required
                disabled={!selectedWard && wardOptions.length > 0}
              />
            )}
          </div>
        </div>

        <div className="card">
          <div className="form-section-title">Farm Details</div>
          <div className="form-group">
            <label className="form-label">Farm Size (Hectares) *</label>
            <input className="form-input" name="farmSize" value={form.farmSize} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label">Primary Crop</label>
            <select className="form-input" name="crop" value={form.crop} onChange={handleChange}>
              <option>Maize</option>
              <option>Sorghum</option>
              <option>Sunflower</option>
              <option>Groundnuts</option>
            </select>
          </div>
        </div>

        <div className="info-strip">
          <div className="info-strip-title">System will auto-assign:</div>
          <div>• Unique Farmer ID</div>
          <div>• Officer ID</div>
          <div>• Registration timestamp</div>
          <div>• Pending approval status</div>
        </div>

        {formError ? <div className="status-note error">{formError}</div> : null}
        {successNote ? <div className="status-note success">{successNote}</div> : null}

        <button
          className="btn-full btn-green btn-loading"
          type="submit"
          disabled={submitting}
        >
          {submitting ? (
            <>
              <span className="btn-spinner" aria-hidden="true" />
              Submitting...
            </>
          ) : 'Submit Registration'}
        </button>
        <button className="btn-full btn-outline" type="button" onClick={handleClear} disabled={submitting}>
          Clear Form
        </button>
      </form>

      {tx ? (
        <div className="tx-card">Transaction submitted: {tx.hash}</div>
      ) : null}
    </div>
  );
};

export default RegisterFarmer;
