const fs = require('fs');

function main() {
	console.log('=== 更新翻译文件 ===');

	try {
		// 读取翻译文件
		console.log('读取翻译文件...');

		if (!fs.existsSync('missing_translations.json')) {
			console.error('❌ 错误：找不到 missing_translations.json 文件');
			return;
		}

		const translationsContent = fs.readFileSync('missing_translations.json', 'utf8');
		const translations = JSON.parse(translationsContent);

		const translationKeys = Object.keys(translations);
		console.log(`找到 ${translationKeys.length} 个翻译条目`);

		// 读取中文文件
		console.log('读取 zh-CN.json...');
		const zhContent = fs.readFileSync('packages/frontend/@n8n/i18n/src/locales/zh-CN.json', 'utf8');
		const zhJson = JSON.parse(zhContent);

		// 更新翻译
		console.log('更新翻译...');
		let updatedCount = 0;
		let notFoundCount = 0;

		translationKeys.forEach((key) => {
			if (key in zhJson) {
				const oldValue = zhJson[key];
				const newValue = translations[key];

				if (oldValue !== newValue) {
					zhJson[key] = newValue;
					updatedCount++;
					console.log(`✓ 更新: ${key}`);
					console.log(`  旧值: "${oldValue}"`);
					console.log(`  新值: "${newValue}"`);
				} else {
					console.log(`- 跳过: ${key} (值相同)`);
				}
			} else {
				console.warn(`⚠️ 警告: 键 "${key}" 在 zh-CN.json 中不存在`);
				notFoundCount++;
			}
		});

		console.log(`\n=== 更新摘要 ===`);
		console.log(`总翻译条目: ${translationKeys.length}`);
		console.log(`成功更新: ${updatedCount}`);
		console.log(`未找到的键: ${notFoundCount}`);
		console.log(`跳过的键: ${translationKeys.length - updatedCount - notFoundCount}`);

		if (updatedCount > 0) {
			// 写入更新后的文件
			console.log('\n写入更新后的 zh-CN.json...');
			fs.writeFileSync(
				'packages/frontend/@n8n/i18n/src/locales/zh-CN.json',
				JSON.stringify(zhJson, null, 2),
				'utf8',
			);
			console.log('✅ zh-CN.json 已更新');

			// 创建备份的差异文件
			const backupFilename = `missing_translations_backup_${new Date().toISOString()
				.slice(0, 19)
				.replace(/:/g, '-')}.json`;
			fs.writeFileSync(backupFilename, translationsContent, 'utf8');
			console.log(`📁 已创建备份文件: ${backupFilename}`);
		} else {
			console.log('ℹ️ 没有需要更新的翻译');
		}
	} catch (error) {
		console.error('❌ 错误:', error.message);
		console.error(error.stack);
	}
}

main();
