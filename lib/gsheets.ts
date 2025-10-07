// lib/gsheets.ts
import { google } from "googleapis";

const PROJECT_ID = process.env.GOOGLE_SHEETS_PROJECT_ID!;
const CLIENT_EMAIL = process.env.GOOGLE_SHEETS_CLIENT_EMAIL!;
const PRIVATE_KEY_RAW = process.env.GOOGLE_SHEETS_PRIVATE_KEY!;
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;

// La clave privada llega con \n escapadas en .env
const PRIVATE_KEY = PRIVATE_KEY_RAW.replace(/\\n/g, "\n");

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
const SHEET_NAME = "events"; // pestaña con tus datos

function getSheetsClient() {
  const jwt = new google.auth.JWT({
    email: CLIENT_EMAIL,
    key: PRIVATE_KEY,
    scopes: SCOPES,
    subject: CLIENT_EMAIL,
  });
  return google.sheets({ version: "v4", auth: jwt });
}

async function getSheetIdByTitle(sheets: ReturnType<typeof getSheetsClient>) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
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

export async function listEventsInRange(fromISO: string, toISO: string): Promise<GSEvent[]> {
  const sheets = getSheetsClient();

  // Leemos todas las filas (A:F) y filtramos por rango
  const resp = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A2:F`, // A1:F1 son encabezados
  });

  const rows = (resp.data.values ?? []) as string[][];
  const out: GSEvent[] = [];

  for (const r of rows) {
    const [id, title, date, type, description, created_at] = r;
    if (!id) continue;
    if (date >= fromISO && date <= toISO) {
      out.push({ id, title, date, type, description, created_at });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

export async function insertEvent(ev: Omit<GSEvent, "created_at">): Promise<GSEvent> {
  const sheets = getSheetsClient();
  const created_at = new Date().toISOString();

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:F`,
    valueInputOption: "RAW",
    requestBody: {
      values: [[ev.id, ev.title, ev.date, ev.type, ev.description ?? "", created_at]],
    },
  });

  return { ...ev, created_at };
}

export async function deleteEventById(id: string): Promise<void> {
  const sheets = getSheetsClient();

  // 1) Buscar índice de fila por ID
  const resp = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A2:A`,
  });

  const ids = (resp.data.values ?? []).map((r) => r[0]);
  const idx = ids.findIndex((v) => v === id);
  if (idx === -1) return; // no encontrado, nada que borrar

  // 2) Borrar esa fila (idx + 2: encabezado + base 0)
  const rowIndex = idx + 2;
  const sheetId = await getSheetIdByTitle(sheets);

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
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
}
