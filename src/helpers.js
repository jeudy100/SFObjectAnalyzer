import fs from 'fs';
import path from 'path';
import { Connection } from 'jsforce';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get the __filename and __dirname for this module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
export const config = JSON.parse(await fs.promises.readFile(path.join(__dirname, '..', 'config.json'), 'utf-8'));

/**
 * Logs in to Salesforce using the provided username and password.
 * @param {string} username - The Salesforce username.
 * @param {string} password - The Salesforce password.
 * @param {string} loginUrl - The Salesforce login URL.
 * @returns {Promise<Connection>} - The Salesforce connection.
 */
export async function login(username, password, loginUrl) {
    const conn = new Connection({ loginUrl });
    try {
        await conn.login(username, password);
        return conn;
    } catch (err) {
        console.error(`Login failed: ${err}`);
        throw err;
    }
}

/**
 * Returns the absolute path to the records directory where the root is the project directory.
 * @returns {string} - The absolute path to the records directory.
 */
export function GetRecordsPath() {
    return path.join(__dirname, '..', config.recordsPath);
}

/**
 * Returns the absolute path to the reports directory where the root is the project directory.
 * @returns {string} - The absolute path to the reports directory.
 */
export function GetReportsPath() {
    return path.join(__dirname, '..', config.reportsPath);
}

/**
 * Returns the absolute path to the spreadsheet file where the root is the project directory.
 * @returns {string} - The absolute path to the spreadsheet file.
 */
export function GetSpreadsheetPath() {
    return path.join(__dirname, '..', config.spreadsheetPath);
}

/**
 * Resets the records directory by deleting and creating it again.
 */
export function resetRecordsDir() {
    const recordsPath = GetRecordsPath();
    fs.rmdirSync(recordsPath, { recursive: true });
    fs.mkdirSync(recordsPath, { recursive: true });
}

/**
 * Resets the reports directory by deleting and creating it again.
 */
export function resetReportsDir() {
    const reportsPath = GetReportsPath();
    fs.rmdirSync(reportsPath, { recursive: true });
    fs.mkdirSync(reportsPath, { recursive: true });
}

/**
 * Resets the spreadsheet directory by deleting and creating it again.
 */
export function resetSpreadsheetDir() {
    const spreadsheetPath = GetSpreadsheetPath();
    fs.rmdirSync(spreadsheetPath, { recursive: true });
    fs.mkdirSync(spreadsheetPath);
}

/**
 * Writes SObject records to a JSON file.
 * @param {string} objectName - The name of the SObject.
 * @param {Object[]} records - An array of SObject records.
 */
export function writeRecordsToJSON(objectName, records) {
    const jsonContent = JSON.stringify(records, null, 2); // Pretty print JSON with 2 spaces indentation
    fs.writeFileSync(`${GetRecordsPath()}/${objectName}.json`, jsonContent);
    console.log(`JSON saved for ${objectName} records`);
}

/**
 * Parses JSON from a file.
 * @param {string} filePath - The absolute path to the file.
 * @returns {Object} - The parsed JSON object.
 */
export function readJsonFile(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

/**
 * Fetches the fields for a given object.
 * @param {Connection} conn - The Salesforce connection.
 * @param {string} objectName - The name of the SObject to fetch fields for.
 * @returns {Promise<Object[]>} - The array of fields for the object.
 */
export async function fetchFields(conn, objectName) {
    try {
        const metadata = await conn.describe(objectName);
        return metadata.fields;
    } catch (err) {
        console.error(`Error fetching fields for ${objectName}: ${err}`);
        return [];
    }
}

/**
 * Fetches the records for a given object.
 * @param {string} objectName - The name of the SObject.
 * @param {Connection} conn - The Salesforce connection.
 * @param {string[]} fieldNames - The names of the fields to retrieve.
 * @returns {Promise<void>} - Resolves when the records are written to a file.
 */
export async function fetchObjectRecords(objectName, conn, fieldNames) {
    const query = `SELECT ${fieldNames.join(',')} FROM ${objectName} WHERE CreatedDate = LAST_N_YEARS:2`;
    try {
        const fsStream = fs.createWriteStream(`${GetRecordsPath()}/${objectName}.csv`);
        const recordStream = (await conn.bulk.query(query)).stream().pipe(fsStream);

        // Handle stream events
        return new Promise((resolve, reject) => {
            fsStream.on('finish', resolve);
            fsStream.on('error', (err) => reject(`Error writing records for ${objectName} to file: ${err}`));
            recordStream.on('error', (err) => reject(`Error fetching records for ${objectName}: ${err}`));
        });
    } catch (err) {
        console.error(`Error fetching records for ${objectName}: ${err}`);
        throw err;
    }
}
