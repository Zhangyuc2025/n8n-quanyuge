#!/usr/bin/env node

/**
 * 更新 nodes-base package.json，移除已备份节点和凭证的引用
 * 基于实际文件系统中存在的节点和凭证来生成配置
 */

const fs = require('fs');
const path = require('path');

const PACKAGE_JSON = path.join(__dirname, '../packages/nodes-base/package.json');
const NODES_DIR = path.join(__dirname, '../packages/nodes-base/nodes');
const CREDS_DIR = path.join(__dirname, '../packages/nodes-base/credentials');

console.log('🔄 开始更新 package.json...\n');

// 读取 package.json
const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf8'));

// 递归查找所有 .node.ts 文件
function findNodeFiles(dir, baseDir = dir) {
	const results = [];
	const files = fs.readdirSync(dir);

	for (const file of files) {
		const filePath = path.join(dir, file);
		const stat = fs.statSync(filePath);

		if (stat.isDirectory()) {
			results.push(...findNodeFiles(filePath, baseDir));
		} else if (file.endsWith('.node.ts')) {
			// 转换为 dist 路径
			const relativePath = path.relative(baseDir, filePath);
			const distPath = 'dist/nodes/' + relativePath.replace(/\.ts$/, '.js');
			results.push(distPath);
		}
	}

	return results.sort();
}

// 递归查找所有 .credentials.ts 文件
function findCredentialFiles(dir) {
	const results = [];
	const files = fs.readdirSync(dir);

	for (const file of files) {
		const filePath = path.join(dir, file);
		const stat = fs.statSync(filePath);

		if (stat.isDirectory()) {
			results.push(...findCredentialFiles(filePath));
		} else if (file.endsWith('.credentials.ts')) {
			const distPath = 'dist/credentials/' + file.replace(/\.ts$/, '.js');
			results.push(distPath);
		}
	}

	return results.sort();
}

// 查找实际存在的文件
const actualNodes = findNodeFiles(NODES_DIR);
const actualCreds = findCredentialFiles(CREDS_DIR);

console.log(`✅ 找到 ${actualNodes.length} 个节点文件`);
console.log(`✅ 找到 ${actualCreds.length} 个凭证文件\n`);

// 更新 package.json
const oldNodesCount = pkg.n8n.nodes.length;
const oldCredsCount = pkg.n8n.credentials.length;

pkg.n8n.nodes = actualNodes;
pkg.n8n.credentials = actualCreds;

// 写回文件
fs.writeFileSync(PACKAGE_JSON, JSON.stringify(pkg, null, 2) + '\n');

console.log('📊 更新统计:');
console.log(
	`   节点: ${oldNodesCount} → ${actualNodes.length} (移除 ${oldNodesCount - actualNodes.length})`,
);
console.log(
	`   凭证: ${oldCredsCount} → ${actualCreds.length} (移除 ${oldCredsCount - actualCreds.length})`,
);
console.log('\n✅ package.json 更新完成！\n');

// 显示部分被移除的节点
const oldNodes = new Set(pkg.n8n.nodes);
const removedNodes = Array.from(oldNodes)
	.filter((n) => !actualNodes.includes(n))
	.slice(0, 10);
if (removedNodes.length > 0) {
	console.log('📝 部分移除的节点示例:');
	removedNodes.forEach((n) => console.log(`   - ${n}`));
	if (oldNodesCount - actualNodes.length > 10) {
		console.log(`   ... 还有 ${oldNodesCount - actualNodes.length - 10} 个\n`);
	}
}
