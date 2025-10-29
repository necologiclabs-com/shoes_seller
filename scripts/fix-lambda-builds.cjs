const fs = require('fs');
const path = require('path');

const LAMBDA_FUNCTIONS = [
    'get-products',
    'get-product-detail',
    'get-prices',
    'sync-products',
    'update-prices',
];

const lambdaRoot = path.join(__dirname, '..', 'lambda');

function copyBuildArtifacts(lambdaDir) {
    const buildDir = path.join(lambdaDir, path.basename(lambdaDir));

    if (!fs.existsSync(buildDir) || !fs.statSync(buildDir).isDirectory()) {
        return;
    }

    const files = fs.readdirSync(buildDir);
    files
        .filter((file) => /\.(js|js\.map|d\.ts|d\.ts\.map)$/.test(file))
        .forEach((file) => {
            const source = path.join(buildDir, file);
            const destination = path.join(lambdaDir, file);
            fs.copyFileSync(source, destination);
        });

    fs.rmSync(buildDir, { recursive: true, force: true });
}

function removeLayerArtifacts(lambdaDir) {
    const duplicatedLayerDir = path.join(lambdaDir, 'layers');
    if (fs.existsSync(duplicatedLayerDir)) {
        fs.rmSync(duplicatedLayerDir, { recursive: true, force: true });
    }
}

for (const fnName of LAMBDA_FUNCTIONS) {
    const fnDir = path.join(lambdaRoot, fnName);
    if (!fs.existsSync(fnDir)) {
        continue;
    }

    copyBuildArtifacts(fnDir);
    removeLayerArtifacts(fnDir);
}
