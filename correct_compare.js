const fs = require('fs');

function main() {
	console.log('=== 正确的JSON文件比较 (针对扁平化键) ===');

	try {
		// 读取两个文件
		console.log('读取文件...');
		const enContent = fs.readFileSync('packages/frontend/@n8n/i18n/src/locales/en.json', 'utf8');
		const enJson = JSON.parse(enContent);

		const zhContent = fs.readFileSync('packages/frontend/@n8n/i18n/src/locales/zh-CN.json', 'utf8');
		const zhJson = JSON.parse(zhContent);

		// 直接获取键，因为en.json已经是扁平化的
		const enKeys = Object.keys(enJson);
		const zhKeys = Object.keys(zhJson);

		console.log(`en.json 键数量: ${enKeys.length}`);
		console.log(`zh-CN.json 键数量: ${zhKeys.length}`);

		// 找出缺失的键
		const missingKeys = enKeys.filter((key) => !(key in zhJson));

		console.log(`zh-CN.json 中缺失的键数量: ${missingKeys.length}`);

		if (missingKeys.length === 0) {
			console.log('✅ 完美！所有键都已同步。');

			// 清理旧的差异文件
			if (fs.existsSync('missing_translations.json')) {
				fs.unlinkSync('missing_translations.json');
				console.log('移除了旧的差异文件');
			}
			return;
		}

		// 显示前10个缺失的键
		console.log('\n前10个缺失的键:');
		missingKeys.slice(0, 10).forEach((key) => {
			console.log(`  - ${key}: "${enJson[key]}"`);
		});

		// 创建差异对象
		console.log('\n创建差异文件...');
		const diffObject = {};
		missingKeys.forEach((key) => {
			diffObject[key] = enJson[key];
		});

		// 写入差异文件
		fs.writeFileSync('missing_translations.json', JSON.stringify(diffObject, null, 2), 'utf8');
		console.log(`✔️ 已将 ${missingKeys.length} 个缺失的键值对写入 missing_translations.json`);

		// 更新 zh-CN.json
		console.log('\n更新 zh-CN.json...');

		// 创建更新后的对象
		const updatedZhJson = { ...zhJson };

		// 直接添加缺失的键
		missingKeys.forEach((key) => {
			updatedZhJson[key] = enJson[key];
		});

		console.log(`成功添加了 ${missingKeys.length} 个键`);

		// 写入更新后的文件
		fs.writeFileSync(
			'packages/frontend/@n8n/i18n/src/locales/zh-CN.json',
			JSON.stringify(updatedZhJson, null, 2),
			'utf8',
		);
		console.log('✔️ zh-CN.json 已更新');

		// 最终验证
		console.log('\n=== 最终验证 ===');
		const verifyContent = fs.readFileSync(
			'packages/frontend/@n8n/i18n/src/locales/zh-CN.json',
			'utf8',
		);
		const verifyJson = JSON.parse(verifyContent);

		const stillMissing = enKeys.filter((key) => !(key in verifyJson));

		if (stillMissing.length === 0) {
			console.log('✅ 验证成功！所有键现已同步。');
			console.log(`最终键数量：${Object.keys(verifyJson).length}`);
		} else {
			console.log(`❌ 验证失败！仍有 ${stillMissing.length} 个键缺失:`);
			stillMissing.slice(0, 5).forEach((key) => {
				console.log(`  - ${key}`);
			});
		}

		// 检查是否有多余的键
		const extraKeys = zhKeys.filter((key) => !(key in enJson));
		if (extraKeys.length > 0) {
			console.log(`\nℹ️ zh-CN.json 中有 ${extraKeys.length} 个额外的键（不存在于 en.json 中）:`);
			extraKeys.slice(0, 5).forEach((key) => {
				console.log(`  - ${key}`);
			});
		}
	} catch (error) {
		console.error('❌ 错误:', error.message);
		console.error(error.stack);
	}
}

main();
