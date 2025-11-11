import { createApp } from 'vue';
import { createPinia } from 'pinia';
import Antd from 'ant-design-vue';
import { i18nInstance } from '@n8n/i18n';
import App from './App.vue';
import router from './router';
import { useAdminAuthStore } from './stores/adminAuth.store';

// Import global styles
import './styles/theme.scss';

console.log('[Admin Panel] 应用初始化开始...');

// Create Vue app
const app = createApp(App);
console.log('[Admin Panel] Vue 应用已创建');

// Create Pinia store
const pinia = createPinia();
console.log('[Admin Panel] Pinia store 已创建');

// Register plugins
app.use(pinia);
console.log('[Admin Panel] Pinia 已注册');

app.use(router);
console.log('[Admin Panel] Router 已注册');

app.use(Antd);
console.log('[Admin Panel] Ant Design Vue 已注册');

app.use(i18nInstance);
console.log('[Admin Panel] i18n 已注册');

// Initialize admin auth store (restore session from localStorage)
const adminAuthStore = useAdminAuthStore();
adminAuthStore.init();
console.log('[Admin Panel] Auth store 已初始化, 已认证:', adminAuthStore.isAuthenticated);

// Mount app
app.mount('#app');
console.log('[Admin Panel] 应用已挂载到 #app');

// Apply admin theme class to body
document.body.classList.add('admin-theme');
console.log('[Admin Panel] 主题类已应用');

// Add global error handler
app.config.errorHandler = (err, instance, info) => {
	console.error('[Admin Panel] Vue 错误捕获:', err);
	console.error('[Admin Panel] 组件实例:', instance);
	console.error('[Admin Panel] 错误信息:', info);
};
