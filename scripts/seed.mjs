import { execSync } from 'node:child_process';

const cmd = 'tsc prisma/seed.ts --target ES2022 --module CommonJS --moduleResolution Node --outDir dist-seed --esModuleInterop true --skipLibCheck --ignoreDeprecations 6.0 --ignoreConfig && node dist-seed/prisma/seed.js';

execSync(cmd, { stdio: 'inherit' });
