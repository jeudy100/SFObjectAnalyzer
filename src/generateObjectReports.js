import fs from 'fs';
import path from 'path';
import { createObjectCsvWriter } from 'csv-writer';
import { GetRecordsPath, GetReportsPath, resetReportsDir } from './helpers.js';
import csv from 'csv-parser';

/**
 * Generate CSV reports for each file in the records directory
 */
async function generateCsvReports() {
    resetReportsDir();
    const recordsDir = GetRecordsPath(); // Adjust this path if necessary
    const files = fs.readdirSync(recordsDir);

    if (files.length === 0) {
        console.error('No records found in the records directory');
        return;
    }

    const reportPromises = files.map((fileName) => {
        return new Promise((resolve, reject) => {
            const objectPath = path.join(recordsDir, fileName);
            const fieldCounts = {};

            // Create a read stream for the CSV file
            const readStream = fs.createReadStream(objectPath)
                .pipe(csv());

            // On data, count the number of populated fields
            readStream.on('data', (record) => {
                Object.keys(record).forEach(field => {
                    if (!fieldCounts[field]) {
                        fieldCounts[field] = { total: 0, populated: 0 };
                    }
                    fieldCounts[field].total += 1;
                    if (record[field] !== null && record[field] !== undefined && record[field] !== '') {
                        fieldCounts[field].populated += 1;
                    }
                });
            });

            // On end generate the CSV report
            readStream.on('end', async () => {
                // Prepare data for CSV
                const csvData = Object.entries(fieldCounts).map(([field, counts]) => ({
                    field,
                    total: counts.total,
                    populated: counts.populated,
                }));

                // Define CSV writer
                const csvWriter = createObjectCsvWriter({
                    path: path.join(GetReportsPath(), fileName),
                    header: [
                        { id: 'field', title: 'Field' },
                        { id: 'total', title: 'Total Records' },
                        { id: 'populated', title: 'Populated Records' }
                    ]
                });

                // Write CSV to disk
                try {
                    await csvWriter.writeRecords(csvData);
                    console.log(`CSV report generated for ${fileName}: ${path.join(GetReportsPath(), fileName)}`);
                    resolve();  // Resolve the promise when writing is done
                } catch (err) {
                    console.error(`Error generating CSV report for ${fileName}: ${err}`);
                    reject(err);  // Reject the promise if there's an error
                }
            });

            readStream.on('error', (err) => {
                console.error(`Error reading file ${fileName}: ${err}`);
                reject(err);  // Reject the promise if there's an error reading the file
            });
        });
    });

    // Wait for all report promises to resolve
    try {
        await Promise.all(reportPromises);
        console.log('All reports generated.');
    } catch (error) {
        console.error('Error generating reports:', error);
    }
}

// Run the report generation process
generateCsvReports();
