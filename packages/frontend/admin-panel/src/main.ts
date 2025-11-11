import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import '@n8n/design-system/css/index.scss';

// Import i18n
import { i18nInstance, setLanguage } from '@n8n/i18n';
import { i18n as designSystemI18n } from '@n8n/design-system/locale';

const app = createApp(App);

app.use(createPinia());
app.use(router);

// Initialize i18n
app.use(i18nInstance);

// Initialize locale from localStorage before mounting
const initLocale = () => {
	try {
		const savedLocale = localStorage.getItem('n8n-locale') || 'zh';
		if (savedLocale !== i18nInstance.global.locale.value) {
			setLanguage(savedLocale);
		}
	} catch (e) {
		console.warn('Failed to read saved locale from localStorage', e);
	}
};
initLocale();

// Hook design-system's i18n to use the same translations as the main app
designSystemI18n((key: string) => {
	return i18nInstance.global.t(key);
});

// Load design-system locale based on current language
const initDesignSystemLocale = async () => {
	const currentLocale = i18nInstance.global.locale.value;
	try {
		const { use } = await import('@n8n/design-system/locale');
		await use(currentLocale);
	} catch (e) {
		console.warn(`Design system locale ${currentLocale} not found, using English`, e);
	}
};
void initDesignSystemLocale();

app.mount('#app');
