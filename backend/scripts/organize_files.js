const fs = require('fs');
const path = require('path');

function ensureDir(dirPath) {
	if (!fs.existsSync(dirPath)) {
		fs.mkdirSync(dirPath, { recursive: true });
	}
}

function moveFileSync(src, destDir) {
	ensureDir(destDir);
	const fileName = path.basename(src);
	const dest = path.join(destDir, fileName);
	fs.renameSync(src, dest);
	return dest;
}

function findFiles(dir, predicate, results = []) {
	if (!fs.existsSync(dir)) return results;
	const entries = fs.readdirSync(dir, { withFileTypes: true });
	for (const entry of entries) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			findFiles(full, predicate, results);
		} else if (predicate(full)) {
			results.push(full);
		}
	}
	return results;
}

(function main() {
	const root = path.resolve(__dirname, '..', '..');
	const backendScripts = path.join(root, 'backend', 'scripts');
	const testTarget = path.join(root, 'test');
	const docsTarget = path.join(root, 'document');

	ensureDir(testTarget);
	ensureDir(docsTarget);

	// Move tests
	const testFiles = findFiles(backendScripts, (p) => /\\test_.*\.js$/i.test(p));
	let movedTests = 0;
	for (const file of testFiles) {
		moveFileSync(file, testTarget);
		movedTests++;
	}

	// Move markdown (exclude uploads)
	const markdownFiles = findFiles(root, (p) => /\.(md|markdown)$/i.test(p) && !p.includes(`${path.sep}uploads${path.sep}`));
	let movedDocs = 0;
	for (const file of markdownFiles) {
		// Skip files already in document
		if (file.startsWith(docsTarget + path.sep)) continue;
		moveFileSync(file, docsTarget);
		movedDocs++;
	}

	console.log(`Moved test files: ${movedTests}`);
	console.log(`Moved markdown files: ${movedDocs}`);
})();
