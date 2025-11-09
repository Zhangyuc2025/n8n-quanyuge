const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('/home/zhang/.n8n/database.sqlite', (err) => {
  if (err) {
    console.error('连接失败:', err);
    process.exit(1);
  }
});

// 查看表结构
db.all("PRAGMA table_info(platform_ai_provider)", (err, rows) => {
  if (err) {
    console.error('查询失败:', err);
  } else {
    console.log('platform_ai_provider 表结构:');
    rows.forEach(row => {
      console.log(`  ${row.name} (${row.type}) ${row.notnull ? 'NOT NULL' : ''} ${row.pk ? 'PRIMARY KEY' : ''}`);
    });
  }
  db.close();
});
