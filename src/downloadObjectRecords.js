import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import { resetRecordsDir, fetchFields, fetchObjectRecords, login } from './helpers.js';

// Parse command-line arguments
const argv = yargs(hideBin(process.argv))
  .option('username', {
    alias: 'u',
    description: 'Salesforce username',
    type: 'string',
    demandOption: true,
  })
  .option('password', {
    alias: 'p',
    description: 'Salesforce password',
    type: 'string',
    demandOption: true,
  })
  .option('objects', {
    alias: 'o',
    description: 'Comma-separated list of Salesforce objects to analyze',
    type: 'string',
    demandOption: true,
  })
  .option('url', {
    alias: 'l',
    description: 'Salesforce environment url',
    type: 'string',
    demandOption: true,
  })
  .option('security token', {
    alias: '-s',
    description: 'Salesforce security token that will be added to the end of the password',
    type: 'string',
    demandOption: true,
  })
  .help()
  .alias('help', 'h')
  .parse();

// Extract command-line arguments
console.log(argv);
const { username, password, objects, url, s } = argv;
console.log(username, password, objects, url);
const objectsToAnalyze = objects.split(',');

/**
 * Downloads Salesforce object records and writes them to JSON files.
 */
async function main() {
    resetRecordsDir();
    // Step 1: Log in to Salesforce
    console.log(password + s)
    const conn = await login(username, password + s, url);

    if (!conn)
      return;

    try {
      for (const objectName of objectsToAnalyze) {
          console.log('Dumping data for ${objectName}...');

          // Step 1: Fetch fields for the object
          const fields = await fetchFields(conn, objectName);

          // if not fields were returned skip to the next object.
          if (fields === undefined || fields === null || fields?.length === 0) 
              continue;

          // Step 2: Fetch all object records and stream them into their respective csv files.
          await fetchObjectRecords(objectName, conn, fields.map(f => f.name));
      }
    } catch (err) {
      console.error(err);
    }

    console.log('Data dump complete.');
}

// Run the download process
try {
  main();
} catch (err) {
  console.error(err);
}