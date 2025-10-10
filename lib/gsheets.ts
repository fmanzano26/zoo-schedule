// lib/gsheets.ts
import { google } from "googleapis";

/* ========= Variables de entorno (validadas) ========= */
const PROJECT_ID = process.env.GOOGLE_SHEETS_PROJECT_ID;
const CLIENT_EMAIL = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
const PRIVATE_KEY_RAW = process.env.GOOGLE_SHEETS_PRIVATE_KEY;
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
const SHEET_NAME = process.env.GOOGLE_SHEETS_SHEET_NAME || "events";

if (!CLIENT_EMAIL || !PRIVATE_KEY_RAW || !SPREADSHEET_ID) {
  throw new Error(
    "[gsheets] Faltan variables de entorno requeridas: GOOGLE_SHEETS_CLIENT_EMAIL, GOOGLE_SHEETS_PRIVATE_KEY, GOOGLE_SHEETS_SPREADSHEET_ID"
  );
}

// La clave privada llega con \n escapadas
const PRIVATE_KEY = PRIVATE_KEY_RAW.replace(/\\n/g, "\n");
const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets.readonly",
  "https://www.googleapis.com/auth/spreadsheets",
];

type SheetsClient = ReturnType<typeof google.sheets>;

/* ========= Cliente global (cacheado) ========= */
let _sheets: SheetsClient | null = null;

function getSheetsClient(): SheetsClient {
  if (_sheets) return _sheets;
  const jwt = new google.auth.JWT({
    email: CLIENT_EMAIL,
    key: PRIVATE_KEY,
    scopes: SCOPES,
  });
  _sheets = google.sheets({ version: "v4", auth: jwt });
  return _sheets;
}

/* ========= Helpers ========= */
async function getSheetIdByTitle(sheets: SheetsClient): Promise<number> {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID! });
  const sheet = meta.data.sheets?.find((s) => s.properties?.title === SHEET_NAME);
  if (!sheet?.properties?.sheetId && sheet?.properties?.sheetId !== 0) {
    throw new Error(`No se encontró la pestaña "${SHEET_NAME}" en la hoja`);
  }
  return sheet.properties.sheetId!;
}

export type GSEvent = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  type: string;
  description?: string;
  created_at: string;
};

/* ========= Lectura ========= */
export async function listEventsInRange(fromISO: string, toISO: string): Promise<GSEvent[]> {
  const sheets = getSheetsClient();
  const resp = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID!,
    range: `${SHEET_NAME}!A2:F`, // A1:F1 son encabezados
  });

  const rows = (resp.data.values ?? []) as string[][];
  const out: GSEvent[] = [];

  for (const r of rows) {
    const [id, title, date, type, description, created_at] = r;
    if (!id) continue;
    if (date >= fromISO && date <= toISO) {
      out.push({
        id,
        title,
        date,
        type,
        description: description || "",
        created_at,
      });
    }
  }

  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/* ========= Inserción ========= */
export async function insertEvent(ev: Omit<GSEvent, "created_at">): Promise<GSEvent> {
  const sheets = getSheetsClient();
  const created_at = new Date().toISOString();

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID!,
    range: `${SHEET_NAME}!A:F`,
    valueInputOption: "RAW",
    requestBody: {
      values: [
        [ev.id, ev.title, ev.date, ev.type, ev.description ?? "", created_at],
      ],
    },
  });

  return { ...ev, description: ev.description ?? "", created_at };
}

/* ========= Borrado ========= */
export async function deleteEventById(id: string): Promise<boolean> {
  const sheets = getSheetsClient();

  // 1️⃣ Buscar índice de fila por ID
  const resp = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID!,
    range: `${SHEET_NAME}!A2:A`,
  });

  const ids = (resp.data.values ?? []).map((r) => r[0]);
  const idx = ids.findIndex((v) => v === id);
  if (idx === -1) return false;

  // 2️⃣ Borrar esa fila
  const rowIndex = idx + 2; // +1 por encabezado, +1 base 1
  const sheetId = await getSheetIdByTitle(sheets);

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID!,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex: rowIndex - 1,
              endIndex: rowIndex,
            },
          },
        },
      ],
    },
  });

  return true;
}

/* ========= Actualización ========= */
export async function updateEventById(ev: {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  type: string;
  description?: string;
}): Promise<GSEvent | null> {
  const sheets = getSheetsClient();

  // 1) localizar la fila (igual que en delete)
  const idsResp = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID!,
    range: `${SHEET_NAME}!A2:A`,
  });
  const ids = (idsResp.data.values ?? []).map((r) => r[0]);
  const idx = ids.findIndex((v) => v === ev.id);
  if (idx === -1) return null;

  const rowIndex = idx + 2;

  // 2) obtener la fila actual para preservar created_at si existe
  const rowResp = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID!,
    range: `${SHEET_NAME}!A${rowIndex}:F${rowIndex}`,
  });
  const current = (rowResp.data.values?.[0] ?? []) as string[];
  const currentCreatedAt = current[5] || new Date().toISOString();

  // 3) actualizar la fila completa (A..F)
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID!,
    range: `${SHEET_NAME}!A${rowIndex}:F${rowIndex}`,
    valueInputOption: "RAW",
    requestBody: {
      values: [[
        ev.id,
        ev.title,
        ev.date,
        ev.type,
        ev.description ?? "",
        currentCreatedAt, // preservamos timestamp original
      ]],
    },
  });

  return {
    id: ev.id,
    title: ev.title,
    date: ev.date,
    type: ev.type,
    description: ev.description ?? "",
    created_at: currentCreatedAt,
  };
}
