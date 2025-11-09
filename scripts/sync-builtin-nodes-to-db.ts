/**
 * 内置节点同步脚本
 * Sync built-in nodes to platform_node database table
 *
 * 功能：
 * 1. 读取所有内置节点定义
 * 2. 提取节点元数据（name, displayName, description, codex等）
 * 3. 同步到 platform_node 表，设置 source_type = 'builtin'
 * 4. 支持教学文档链接的自动提取和后续管理
 *
 * 使用：
 * - 构建时自动执行：pnpm build 后调用
 * - 手动执行：pnpm sync:builtin-nodes
 */

import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { PlatformNode } from '@n8n/db/entities/platform-node.entity';
import type { INodeTypeDescription, INodeTypeBaseDescription } from 'n8n-workflow';

interface BuiltinNodeInfo {
	nodeKey: string;
	nodeName: string;
	description: string | null;
	category: string | null;
	iconUrl: string | null;
	version: string;
	documentationUrl: string | null;
	documentationConfig: Record<string, unknown> | null;
	codex: Record<string, unknown> | null;
	nodeDefinition: Record<string, unknown>;
}

/**
 * 从节点定义中提取文档URL
 */
function extractDocumentationUrl(codex?: Record<string, unknown>): string | null {
	if (!codex || !codex.resources) return null;

	const resources = codex.resources as Record<string, unknown>;
	if (!resources.primaryDocumentation) return null;

	const docs = resources.primaryDocumentation as Array<{ url: string }>;
	return docs[0]?.url || null;
}

/**
 * 构建完整的文档配置对象
 * 包含主文档、教程、示例等所有链接
 */
function buildDocumentationConfig(codex?: Record<string, unknown>): Record<string, unknown> | null {
	if (!codex || !codex.resources) return null;

	const resources = codex.resources as Record<string, unknown>;
	const config: Record<string, unknown> = {};

	// 1. 主要文档链接
	if (resources.primaryDocumentation) {
		config.primaryDocumentation = resources.primaryDocumentation;
	}

	// 2. 教程链接（从 tutorialLinks 中提取，支持任意键名）
	if (resources.tutorialLinks) {
		const tutorialLinks = resources.tutorialLinks as Record<string, string>;
		config.tutorialLinks = tutorialLinks;
	}

	// 3. 其他文档资源（视频、博客等）
	if (resources.videos) {
		config.videos = resources.videos;
	}
	if (resources.blogs) {
		config.blogs = resources.blogs;
	}

	return Object.keys(config).length > 0 ? config : null;
}

/**
 * 从节点定义中提取分类
 */
function extractCategory(nodeDescription: INodeTypeDescription): string | null {
	if (!nodeDescription.group || nodeDescription.group.length === 0) return null;
	return nodeDescription.group[0];
}

/**
 * 解析内置节点信息
 */
function parseBuiltinNodeInfo(
	nodeType: any,
	nodeDescription: INodeTypeDescription,
): BuiltinNodeInfo {
	const codex = (nodeDescription as any).codex || null;
	const documentationUrl = extractDocumentationUrl(codex);
	const documentationConfig = buildDocumentationConfig(codex);

	return {
		nodeKey: nodeDescription.name,
		nodeName: nodeDescription.displayName,
		description: nodeDescription.description || null,
		category: extractCategory(nodeDescription),
		iconUrl: nodeDescription.icon || null,
		version: String(nodeDescription.defaultVersion || nodeDescription.version || '1.0.0'),
		documentationUrl,
		documentationConfig, // 使用新的完整配置
		codex,
		nodeDefinition: nodeDescription as Record<string, unknown>,
	};
}

/**
 * 同步单个内置节点到数据库
 */
async function syncBuiltinNode(
	dataSource: DataSource,
	nodeInfo: BuiltinNodeInfo,
): Promise<void> {
	const repository = dataSource.getRepository(PlatformNode);

	// 检查节点是否已存在
	const existing = await repository.findOne({
		where: {
			nodeKey: nodeInfo.nodeKey,
			sourceType: 'builtin' as any,
		},
	});

	if (existing) {
		// 更新现有节点
		await repository.update(
			{ id: existing.id },
			{
				nodeName: nodeInfo.nodeName,
				description: nodeInfo.description,
				category: nodeInfo.category,
				iconUrl: nodeInfo.iconUrl,
				version: nodeInfo.version,
				// 只在文档URL为空时更新（保留管理员在后台修改的URL）
				documentationUrl: existing.documentationUrl || nodeInfo.documentationUrl,
				documentationConfig: nodeInfo.documentationConfig,
				codex: nodeInfo.codex,
				nodeDefinition: nodeInfo.nodeDefinition,
				// 内置节点代码在源文件中，不存数据库
				nodeCode: null,
			},
		);
		console.log(`✅ Updated builtin node: ${nodeInfo.nodeKey} (${nodeInfo.nodeName})`);
	} else {
		// 创建新节点
		const newNode = repository.create({
			nodeKey: nodeInfo.nodeKey,
			nodeName: nodeInfo.nodeName,
			nodeType: 'builtin', // 保持向后兼容
			sourceType: 'builtin' as any,
			description: nodeInfo.description,
			category: nodeInfo.category,
			iconUrl: nodeInfo.iconUrl,
			version: nodeInfo.version,
			documentationUrl: nodeInfo.documentationUrl,
			documentationConfig: nodeInfo.documentationConfig,
			codex: nodeInfo.codex,
			nodeDefinition: nodeInfo.nodeDefinition,
			nodeCode: null, // 内置节点代码在源文件中
			isBillable: false,
			pricePerRequest: null,
			submissionStatus: null,
			submittedBy: null,
			reviewedBy: null,
			isActive: true,
			enabled: true,
		});

		await repository.save(newNode);
		console.log(`✨ Created builtin node: ${nodeInfo.nodeKey} (${nodeInfo.nodeName})`);
	}
}

/**
 * 主函数：同步所有内置节点
 */
async function syncAllBuiltinNodes(): Promise<void> {
	console.log('🚀 Starting builtin nodes synchronization...\n');

	try {
		// 1. 初始化数据库连接
		const dataSource = Container.get(DataSource);
		if (!dataSource.isInitialized) {
			await dataSource.initialize();
		}

		// 2. 动态导入 LoadNodesAndCredentials
		const { LoadNodesAndCredentials } = await import('@/load-nodes-and-credentials');
		const nodesAndCredentials = Container.get(LoadNodesAndCredentials);

		// 3. 加载所有节点
		await nodesAndCredentials.loadNodeTypes();
		const loadedNodes = nodesAndCredentials.loaded.nodes;

		console.log(`📦 Found ${Object.keys(loadedNodes).length} builtin nodes\n`);

		// 4. 同步每个节点
		let syncedCount = 0;
		let updatedCount = 0;
		let errorCount = 0;

		for (const [nodeName, nodeData] of Object.entries(loadedNodes)) {
			try {
				const nodeType = nodeData.type;
				const nodeDescription = nodeType.description;

				// 跳过非内置节点（社区节点等）
				if (nodeData.sourcePath && nodeData.sourcePath.includes('node_modules')) {
					continue;
				}

				const nodeInfo = parseBuiltinNodeInfo(nodeType, nodeDescription);

				const existing = await dataSource.getRepository(PlatformNode).findOne({
					where: { nodeKey: nodeInfo.nodeKey, sourceType: 'builtin' as any },
				});

				await syncBuiltinNode(dataSource, nodeInfo);

				if (existing) {
					updatedCount++;
				} else {
					syncedCount++;
				}
			} catch (error) {
				console.error(`❌ Error syncing node ${nodeName}:`, error);
				errorCount++;
			}
		}

		// 5. 打印总结
		console.log('\n✅ Synchronization completed!');
		console.log(`   - New nodes: ${syncedCount}`);
		console.log(`   - Updated nodes: ${updatedCount}`);
		console.log(`   - Errors: ${errorCount}`);
		console.log(`   - Total: ${syncedCount + updatedCount}\n`);

		// 6. 关闭数据库连接
		await dataSource.destroy();
	} catch (error) {
		console.error('❌ Synchronization failed:', error);
		process.exit(1);
	}
}

// 执行同步
syncAllBuiltinNodes().catch((error) => {
	console.error('Fatal error:', error);
	process.exit(1);
});
