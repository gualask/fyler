import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const cargoTargetDir = resolve('src-tauri/target/standalone');
const args = [
    'tauri',
    'build',
    '--no-bundle',
    '--config',
    'src-tauri/tauri.standalone.conf.json',
    '--',
    '--no-default-features',
];

const result = spawnSync('pnpm', args, {
    env: {
        ...process.env,
        CARGO_TARGET_DIR: cargoTargetDir,
    },
    shell: process.platform === 'win32',
    stdio: 'inherit',
});

process.exit(result.status ?? 1);
