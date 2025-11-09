/**
 * 向数据库插入测试 AI 提供商数据
 */
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');

// 连接数据库
const db = new sqlite3.Database('/home/zhang/.n8n/database.sqlite', (err) => {
  if (err) {
    console.error('❌ 连接数据库失败:', err);
    process.exit(1);
  }
  console.log('✅ 已连接到 SQLite 数据库');
});

// 简单的加密函数（模拟 n8n 的加密方式）
// 注意：这只是测试数据，实际应该使用 n8n 的 Cipher 类
function encryptApiKey(apiKey) {
  // 使用简单的 base64 编码作为占位符
  // 实际的 n8n 使用 AES 加密
  return Buffer.from(apiKey).toString('base64');
}

// 准备测试数据
const providers = [
  {
    provider_key: 'openai',
    provider_name: 'OpenAI',
    api_key_encrypted: encryptApiKey('sk-test-openai-key-placeholder'),
    api_endpoint: 'https://api.openai.com',
    models_config: JSON.stringify({
      models: [
        {
          id: 'gpt-4-turbo',
          name: 'GPT-4 Turbo',
          description: 'Most capable GPT-4 model, optimized for chat',
          pricePerToken: 0.00006,
          currency: 'CNY',
          contextWindow: 128000,
          maxOutputTokens: 4096,
          supportsFunctions: true,
          supportsVision: false
        },
        {
          id: 'gpt-4o',
          name: 'GPT-4o',
          description: 'Latest multimodal flagship model',
          pricePerToken: 0.00003,
          currency: 'CNY',
          contextWindow: 128000,
          maxOutputTokens: 4096,
          supportsFunctions: true,
          supportsVision: true
        },
        {
          id: 'gpt-3.5-turbo',
          name: 'GPT-3.5 Turbo',
          description: 'Fast and cost-effective model',
          pricePerToken: 0.000003,
          currency: 'CNY',
          contextWindow: 16385,
          maxOutputTokens: 4096,
          supportsFunctions: true,
          supportsVision: false
        }
      ]
    }),
    quota_config: JSON.stringify({
      monthlyTokens: 10000000,
      currentUsed: 0
    }),
    is_active: 1,
    enabled: 1
  },
  {
    provider_key: 'anthropic',
    provider_name: 'Anthropic',
    api_key_encrypted: encryptApiKey('sk-ant-test-anthropic-key-placeholder'),
    api_endpoint: 'https://api.anthropic.com',
    models_config: JSON.stringify({
      models: [
        {
          id: 'claude-3-5-sonnet-20241022',
          name: 'Claude 3.5 Sonnet',
          description: 'Most intelligent Claude model',
          pricePerToken: 0.00018,
          currency: 'CNY',
          contextWindow: 200000,
          maxOutputTokens: 8192,
          supportsFunctions: true,
          supportsVision: true
        },
        {
          id: 'claude-3-opus-20240229',
          name: 'Claude 3 Opus',
          description: 'Powerful model for complex tasks',
          pricePerToken: 0.00105,
          currency: 'CNY',
          contextWindow: 200000,
          maxOutputTokens: 4096,
          supportsFunctions: true,
          supportsVision: true
        },
        {
          id: 'claude-3-haiku-20240307',
          name: 'Claude 3 Haiku',
          description: 'Fastest and most compact Claude model',
          pricePerToken: 0.000015,
          currency: 'CNY',
          contextWindow: 200000,
          maxOutputTokens: 4096,
          supportsFunctions: true,
          supportsVision: true
        }
      ]
    }),
    quota_config: JSON.stringify({
      monthlyTokens: 10000000,
      currentUsed: 0
    }),
    is_active: 1,
    enabled: 1
  }
];

// 插入数据
async function insertProviders() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // 先删除已存在的测试数据
      db.run(`DELETE FROM platform_ai_provider WHERE provider_key IN ('openai', 'anthropic')`, (err) => {
        if (err) {
          console.log('⚠️  删除旧数据时出错 (可能表不存在):', err.message);
        } else {
          console.log('🗑️  已清理旧的测试数据');
        }
      });

      // 插入新数据
      const stmt = db.prepare(`
        INSERT INTO platform_ai_provider (
          provider_key, provider_name, api_key_encrypted, api_endpoint,
          models_config, quota_config, is_active, enabled,
          createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `);

      let insertCount = 0;
      providers.forEach((provider) => {
        stmt.run(
          provider.provider_key,
          provider.provider_name,
          provider.api_key_encrypted,
          provider.api_endpoint,
          provider.models_config,
          provider.quota_config,
          provider.is_active,
          provider.enabled,
          (err) => {
            if (err) {
              console.error(`❌ 插入 ${provider.provider_name} 失败:`, err.message);
            } else {
              insertCount++;
              console.log(`✅ 已插入提供商: ${provider.provider_name}`);

              // 解析并显示模型
              const config = JSON.parse(provider.models_config);
              console.log(`   模型数量: ${config.models.length}`);
              config.models.forEach(model => {
                console.log(`   - ${model.name} (${model.id}): ¥${model.pricePerToken}/1K tokens`);
              });
            }

            if (insertCount === providers.length) {
              resolve();
            }
          }
        );
      });

      stmt.finalize();
    });
  });
}

// 执行插入并查询验证
insertProviders()
  .then(() => {
    console.log('\n📊 验证数据...');
    db.all('SELECT provider_key, provider_name, is_active, enabled FROM platform_ai_provider', (err, rows) => {
      if (err) {
        console.error('❌ 查询失败:', err);
      } else {
        console.log('\n✅ 数据库中的 AI 提供商:');
        rows.forEach(row => {
          console.log(`   - ${row.provider_name} (${row.provider_key}): active=${row.is_active}, enabled=${row.enabled}`);
        });
      }
      db.close();
      console.log('\n🎉 完成！');
    });
  })
  .catch(err => {
    console.error('❌ 错误:', err);
    db.close();
    process.exit(1);
  });
