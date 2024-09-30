import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import { GetReportsPath, GetSpreadsheetPath } from './helpers.js';

/**
 * Generate an Excel spreadsheet from the CSV reports
 */
async function generateSpreadsheet() {
    const reportsDir = GetReportsPath(); // Path to the reports directory
    const spreadsheetPath = GetSpreadsheetPath();

    if (!fs.existsSync(spreadsheetPath))
        fs.mkdirSync(spreadsheetPath);

    const files = fs.readdirSync(reportsDir);

    if (files.length === 0) {
        console.error('No reports found in the reports directory');
        return;
    }

    const workbook = new ExcelJS.Workbook();

    for (const fileName of files) {
        if (!fileName.endsWith('.csv')) continue; // Only process CSV files

        const reportPath = path.join(reportsDir, fileName);
        const csvData = fs.readFileSync(reportPath, 'utf-8');
        const rows = csvData.split('\n').map(row => row.split(','));

        const objectName = fileName.replace('.csv', '');
        const worksheet = workbook.addWorksheet(objectName);

        // Add headers
        const xlrows = ['Field', 'Total Records', 'Populated Records', 'Utilization Percentage', 'Description'];
        worksheet.addRow(xlrows);

        // Set the width for Field and Description columns to be 50 and the other fields to be 35.
        for (const i = 1; i <= xlrows; i++)
            worksheet.getColumn(i).width = i === 1 || i === 5 ? 50 : 35;

        // Process each row of CSV data
        for (let i = 1; i < rows.length; i++) { // Skip header
            const [field, total, populated] = rows[i];
            const totalRecords = parseInt(total);
            const populatedRecords = parseInt(populated);
            const utilizationPercentage = totalRecords ? ((populatedRecords / totalRecords) * 100).toFixed(2) : 0;
            const description = ''; // Placeholder for field description

            // Add row to worksheet
            worksheet.addRow([field, totalRecords, populatedRecords, utilizationPercentage, description]);
        }
    }

    // Save the workbook to a file
    const spreadsheetFilePath = path.join(GetSpreadsheetPath(), 'Salesforce_Report.xlsx');
    await workbook.xlsx.writeFile(spreadsheetFilePath);
    console.log(`Spreadsheet generated: ${spreadsheetFilePath}`);
}

// Run the spreadsheet generation process
generateSpreadsheet();
