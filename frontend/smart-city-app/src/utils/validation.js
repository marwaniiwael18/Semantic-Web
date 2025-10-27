// validation.js - shared form validators
export function validateTransport(form) {
  const errors = {};
  if (!form.nom || form.nom.trim().length < 2) {
    const val = form.nom ? form.nom : '';
    errors.nom = `Le nom "${val}" est trop court — entrez au moins 2 caractères.`;
  }

  if (form.capacite) {
    const cap = Number(form.capacite);
    if (!Number.isFinite(cap) || cap <= 0 || !Number.isInteger(cap)) {
      errors.capacite = `La capacité "${form.capacite}" est invalide — saisissez un entier positif (ex: 50).`;
    }
  }

  if (form.vitesseMax) {
    const v = Number(form.vitesseMax);
    if (!Number.isFinite(v) || v <= 0) {
      errors.vitesseMax = `La vitesse "${form.vitesseMax}" est invalide — saisissez un nombre positif (ex: 90).`;
    }
  }

  if (form.immatriculation) {
    const re = /^[A-Z0-9-]{2,}$/i;
    if (!re.test(form.immatriculation)) {
      errors.immatriculation = `L' immatriculation "${form.immatriculation}" semble invalide — format attendu: lettres, chiffres et '-' (ex: BUS-101-TN).`;
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateZone(form) {
  const errors = {};
  if (!form.nom || form.nom.trim().length < 2) {
    errors.nom = `Le nom de la zone "${form.nom || ''}" est requis et doit contenir au moins 2 caractères.`;
  }
  if (form.superficie) {
    const s = Number(form.superficie);
    if (!Number.isFinite(s) || s < 0) errors.superficie = `Superficie "${form.superficie}" invalide — saisissez un nombre positif (km²).`;
  }
  if (form.population) {
    const p = Number(form.population);
    if (!Number.isFinite(p) || p < 0 || !Number.isInteger(p)) errors.population = `Population "${form.population}" invalide — saisissez un entier positif.`;
  }
  if (form.description && form.description.length > 2000) errors.description = 'Description trop longue (max 2000 caractères)';

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateStation(form) {
  const errors = {};
  if (!form.nom || form.nom.trim().length < 2) errors.nom = `Le nom de la station "${form.nom || ''}" est requis`;

  const lat = Number(form.latitude);
  const lng = Number(form.longitude);
  if (form.latitude === '' || !Number.isFinite(lat) || lat < -90 || lat > 90) {
    errors.latitude = `Latitude "${form.latitude}" invalide — valeur attendue entre -90 et 90.`;
  }
  if (form.longitude === '' || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    errors.longitude = `Longitude "${form.longitude}" invalide — valeur attendue entre -180 et 180.`;
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateEvent(form) {
  const errors = {};
  if (!form.nom || form.nom.trim().length < 2) errors.nom = `Le nom de l'événement "${form.nom || ''}" est requis`;
  const g = Number(form.gravite);
  if (!Number.isFinite(g) || g < 1 || g > 5) errors.gravite = `Gravité "${form.gravite}" invalide — choisissez une valeur entre 1 (faible) et 5 (élevée).`;
  if (form.date) {
    // Basic YYYY-MM-DD check
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) errors.date = `La date "${form.date}" est invalide — format attendu: YYYY-MM-DD`;
  }
  if (form.description && form.description.length > 5000) errors.description = 'Description trop longue (max 5000 caractères)';

  return { valid: Object.keys(errors).length === 0, errors };
}
