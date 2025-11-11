import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
	base: '/admin/',
	plugins: [vue()],
	resolve: {
		alias: {
			'@': resolve(__dirname, 'src'),
		},
	},
	server: {
		port: 5679,
		proxy: {
			'/rest': {
				target: 'http://localhost:5678',
				changeOrigin: true,
			},
		},
	},
	build: {
		outDir: 'dist',
		// 生产环境不生成 sourcemap（减少构建产物大小）
		sourcemap: false,
		// 使用 terser 压缩（更好的压缩率）
		minify: 'terser',
		terserOptions: {
			compress: {
				// 移除 console 和 debugger（生产环境）
				drop_console: true,
				drop_debugger: true,
				// 移除未使用的代码
				pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn'],
			},
		},
		// 代码分割优化
		rollupOptions: {
			output: {
				manualChunks(id) {
					// Ant Design Vue 单独分块
					if (id.includes('ant-design-vue')) {
						return 'ant-design-vue';
					}
					// Ant Design Icons 单独分块
					if (id.includes('@ant-design/icons-vue')) {
						return 'ant-icons';
					}
					// ECharts 单独分块
					if (id.includes('echarts')) {
						return 'echarts';
					}
					// Vue 全家桶单独分块
					if (id.includes('vue') || id.includes('vue-router') || id.includes('pinia')) {
						return 'vue-vendor';
					}
					// Day.js 单独分块
					if (id.includes('dayjs')) {
						return 'dayjs';
					}
				},
				// 为代码分割的 chunk 提供更友好的名称
				chunkFileNames: 'js/[name]-[hash].js',
				entryFileNames: 'js/[name]-[hash].js',
				assetFileNames: (assetInfo) => {
					// 根据文件类型组织资源
					if (assetInfo.name?.endsWith('.css')) {
						return 'css/[name]-[hash][extname]';
					}
					if (/\.(png|jpe?g|gif|svg|ico)$/.test(assetInfo.name || '')) {
						return 'images/[name]-[hash][extname]';
					}
					if (/\.(woff2?|eot|ttf|otf)$/.test(assetInfo.name || '')) {
						return 'fonts/[name]-[hash][extname]';
					}
					return 'assets/[name]-[hash][extname]';
				},
			},
		},
		// chunk 大小警告阈值（1MB）
		chunkSizeWarningLimit: 1000,
		// 启用 CSS 代码分割
		cssCodeSplit: true,
		// 静态资源处理阈值（小于 4KB 转 base64）
		assetsInlineLimit: 4096,
	},
	// 优化依赖预构建
	optimizeDeps: {
		include: [
			'vue',
			'vue-router',
			'pinia',
			'ant-design-vue',
			'@ant-design/icons-vue',
			'echarts',
			'dayjs',
		],
	},
});
