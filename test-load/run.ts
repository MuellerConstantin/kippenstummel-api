import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

type LoadTestMetadata = {
  target: string;
  timestamp: string;
  artilleryConfig: string;
  reportFile: string;
  nodeVersion: string;
};

const target = process.env.TARGET ?? 'http://localhost:8080/api/v1';

const loadTestDir = __dirname;
const artilleryConfig = path.join(loadTestDir, 'artillery.yml');
const reportsDir = path.join(loadTestDir, 'reports');

fs.mkdirSync(reportsDir, { recursive: true });

const reportFile = path.join(reportsDir, `artillery.report.json`);
const metaFile = path.join(reportsDir, `artillery.meta.json`);

console.log('Running Artillery load test');
console.log('Target:', target);
console.log('Config:', artilleryConfig);
console.log();

execSync(`artillery run "${artilleryConfig}" --output "${reportFile}"`, {
  stdio: 'inherit',
  env: {
    ...process.env,
    TARGET: target,
  },
});

const metadata: LoadTestMetadata = {
  target,
  timestamp: new Date().toISOString(),
  artilleryConfig,
  reportFile,
  nodeVersion: process.version,
};

fs.writeFileSync(metaFile, JSON.stringify(metadata, null, 2));

console.log('\nReports written:');
console.log(reportFile);
console.log(metaFile);
