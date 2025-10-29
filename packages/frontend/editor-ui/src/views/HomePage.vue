<template>
	<PageViewLayout>
		<div :class="$style.content">
			<N8nHeading tag="h1" size="2xlarge" :class="$style.title">
				{{ i18n.baseText('homePage.welcome') }}
			</N8nHeading>
			<N8nText size="large" color="text-base">
				{{ i18n.baseText('homePage.subtitle') }}
			</N8nText>
		</div>
	</PageViewLayout>
</template>

<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { N8nHeading, N8nText } from '@n8n/design-system';
import PageViewLayout from '@/components/layouts/PageViewLayout.vue';

const i18n = useI18n();
</script>

<style module lang="scss">
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding-top: var(--spacing--2xl);
}

.title {
	color: var(--color--text--shade-1);
}
</style>
