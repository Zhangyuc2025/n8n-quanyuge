<template>
	<div class="error-container">
		<a-result status="403" title="403" sub-title="抱歉，您无权访问此页面">
			<template #extra>
				<a-space>
					<a-button type="primary" @click="goBack">返回上一页</a-button>
					<a-button @click="goHome">返回首页</a-button>
				</a-space>
			</template>
		</a-result>
	</div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();

function goBack() {
	router.back();
}

function goHome() {
	router.push('/');
}
</script>

<style scoped lang="scss">
.error-container {
	min-height: 100vh;
	display: flex;
	align-items: center;
	justify-content: center;
	background: #f5f5f5;
}
</style>
