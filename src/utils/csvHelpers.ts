import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { type ParticipantWithRegistration } from '../types';

/**
 * Auto-detect columns for first_name and last_name from headers if present
 */
export function autoDetectColumns(headers: string[]): {
  firstNameField: string;
  lastNameField: string;
} {
  let firstNameField = '';
  let lastNameField = '';

  const clean = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

  for (const h of headers) {
    const ch = clean(h);

    // First name detection
    if (!firstNameField && (ch.includes('prenom') || ch.includes('first name') || ch === 'first_name')) {
      firstNameField = h;
    }

    // Last name detection
    if (!lastNameField && (ch.includes('nom de famille') || ch.includes('last name') || ch === 'last_name' || (ch.includes('nom') && !ch.includes('prenom') && !ch.includes('complet')))) {
      lastNameField = h;
    }
  }

  // Fallbacks if not matched
  if (!firstNameField) {
    const found = headers.find((h) => clean(h).includes('prenom'));
    if (found) firstNameField = found;
  }
  if (!lastNameField) {
    const found = headers.find((h) => h !== firstNameField && (clean(h).includes('nom de famille') || clean(h).includes('last name')));
    if (found) lastNameField = found;
  }

  return {
    firstNameField: firstNameField || '',
    lastNameField: lastNameField || '',
  };
}

/**
 * Read an .xlsx / .xls file into the same row-object shape produced by PapaParse
 * for CSV files. The first (non-empty) row supplies the headers; every following
 * row is an object keyed by those (trimmed) headers.
 */
export async function xlsxToRows(
  file: File
): Promise<{ headers: string[]; rows: Record<string, any>[] }> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('Le fichier Excel ne contient aucune feuille.');
  }
  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  });

  if (!matrix || matrix.length === 0) {
    throw new Error('Le fichier Excel ne contient aucune donnée valide.');
  }

  // First non-empty row = headers
  let headerRowIndex = -1;
  const headers: string[] = [];
  for (let i = 0; i < matrix.length; i++) {
    const row = matrix[i] as unknown[];
    const cleaned = (row || []).map((c) => String(c ?? '').trim());
    if (cleaned.some((c) => c !== '')) {
      headerRowIndex = i;
      cleaned.forEach((c, idx) => {
        headers[idx] = c !== '' ? c : `colonne_${idx + 1}`;
      });
      break;
    }
  }

  if (headerRowIndex === -1 || headers.length === 0) {
    throw new Error('Le fichier Excel ne contient aucune donnée valide.');
  }

  const rows: Record<string, any>[] = [];
  for (let i = headerRowIndex + 1; i < matrix.length; i++) {
    const row = matrix[i] as unknown[];
    if (!row) continue;
    const record: Record<string, any> = {};
    let hasValue = false;
    headers.forEach((h, idx) => {
      const val = idx < row.length ? (row[idx] ?? '') : '';
      const cell = typeof val === 'string' ? val.trim() : val;
      record[h] = cell;
      if (cell !== '' && cell !== null && cell !== undefined) hasValue = true;
    });
    if (hasValue) rows.push(record);
  }

  return { headers, rows };
}

/**
 * Export conference participants to CSV including all dynamic answers
 */
export function exportParticipantsToCSV(
  eventTitle: string,
  data: ParticipantWithRegistration[]
): void {
  if (!data || data.length === 0) {
    alert('Aucun participant à exporter pour cette conférence.');
    return;
  }

  // Collect all unique answer keys across all participants
  const dynamicKeysSet = new Set<string>();
  data.forEach((d) => {
    if (d.registration.answers) {
      Object.keys(d.registration.answers).forEach((k) => dynamicKeysSet.add(k));
    }
  });
  const dynamicKeys = Array.from(dynamicKeysSet);

  const rows = data.map((d) => {
    const row: Record<string, any> = {
      'Prénom': d.participant.first_name || '',
      'Nom': d.participant.last_name || '',
      'Statut Suivi':
        d.registration.followupStatus === 'COMPLETED'
          ? 'Terminé'
          : d.registration.followupStatus === 'IN_PROGRESS'
          ? 'En cours'
          : 'Non démarré',
      'Chargé Suivi (Spirituel)': d.registration.assignedFollowupStaffName || '',
      'Statut Mentorat':
        d.registration.mentoringStatus === 'ASSIGNED'
          ? 'Mentor attribué'
          : d.registration.mentoringStatus === 'SEEKING'
          ? 'En recherche'
          : 'Non demandé',
      'Mentor Attribué': d.registration.assignedMentorName || '',
      'Notes internes': d.registration.notes || '',
      'Date Inscription': d.registration.createdAt
        ? new Date(d.registration.createdAt).toLocaleDateString('fr-FR')
        : '',
    };

    // Add dynamic answers
    dynamicKeys.forEach((key) => {
      row[key] = d.registration.answers?.[key] ?? '';
    });

    return row;
  });

  const csv = Papa.unparse(rows);
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const sanitizedTitle = eventTitle.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
  link.setAttribute('href', url);
  link.setAttribute('download', `participants_${sanitizedTitle}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
