<template>
	<div class="code-editor-wrapper">
		<div
			ref="editorContainer"
			class="code-editor-container"
			:style="{ height: height + 'px' }"
		></div>
		<div v-if="errors.length > 0" class="error-messages">
			<div v-for="(error, index) in errors" :key="index" class="error-message">
				{{ error }}
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { EditorView, lineNumbers, highlightActiveLine, keymap } from '@codemirror/view';
import { EditorState, Extension } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { linter, Diagnostic, lintGutter } from '@codemirror/lint';
import { history } from '@codemirror/commands';
import { bracketMatching, foldGutter, indentOnInput } from '@codemirror/language';
import { defaultKeymap } from '@codemirror/commands';

interface Props {
	modelValue: string;
	language?: 'typescript' | 'json';
	height?: number;
	readonly?: boolean;
	placeholder?: string;
}

const props = withDefaults(defineProps<Props>(), {
	language: 'typescript',
	height: 400,
	readonly: false,
	placeholder: '',
});

const emit = defineEmits<{
	(e: 'update:modelValue', value: string): void;
	(e: 'validate', errors: string[]): void;
}>();

const editorContainer = ref<HTMLDivElement | null>(null);
const errors = ref<string[]>([]);
let editorView: EditorView | null = null;

// Create linter for syntax validation
const createLinter = () => {
	return linter((view) => {
		const diagnostics: Diagnostic[] = [];
		const content = view.state.doc.toString();

		try {
			if (props.language === 'json') {
				// Validate JSON syntax
				JSON.parse(content || '{}');
			}
		} catch (err: any) {
			const message = err.message || 'Syntax error';
			diagnostics.push({
				from: 0,
				to: content.length,
				severity: 'error',
				message,
			});
			errors.value = [message];
			emit('validate', [message]);
		}

		if (diagnostics.length === 0) {
			errors.value = [];
			emit('validate', []);
		}

		return diagnostics;
	});
};

// Create editor theme
const createTheme = (): Extension => {
	return EditorView.theme({
		'&': {
			backgroundColor: 'var(--admin-bg-secondary)',
			color: 'var(--admin-text-primary)',
			fontSize: '14px',
			fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace",
		},
		'.cm-content': {
			caretColor: 'var(--admin-primary)',
			padding: 'var(--admin-spacing-md)',
		},
		'.cm-line': {
			padding: '0 var(--admin-spacing-xs)',
		},
		'.cm-gutters': {
			backgroundColor: 'var(--admin-bg-tertiary)',
			color: 'var(--admin-text-secondary)',
			border: 'none',
			borderRight: '1px solid var(--admin-border-color)',
		},
		'.cm-activeLineGutter': {
			backgroundColor: 'rgba(24, 144, 255, 0.1)',
		},
		'.cm-activeLine': {
			backgroundColor: 'rgba(24, 144, 255, 0.05)',
		},
		'.cm-selectionBackground': {
			backgroundColor: 'rgba(24, 144, 255, 0.2) !important',
		},
		'.cm-focused .cm-selectionBackground': {
			backgroundColor: 'rgba(24, 144, 255, 0.3) !important',
		},
		'.cm-cursor': {
			borderLeftColor: 'var(--admin-primary)',
		},
		'&.cm-focused': {
			outline: 'none',
		},
		'.cm-placeholder': {
			color: 'var(--admin-text-disabled)',
		},
	});
};

// Initialize editor
const initEditor = async () => {
	if (!editorContainer.value) return;

	// Select language mode
	const languageExtension =
		props.language === 'json'
			? json()
			: javascript({ typescript: props.language === 'typescript' });

	// Build extensions array
	const extensions: Extension[] = [
		lineNumbers(),
		highlightActiveLine(),
		history(),
		indentOnInput(),
		bracketMatching(),
		foldGutter(),
		lintGutter(),
		keymap.of(defaultKeymap),
		languageExtension,
		createTheme(),
		createLinter(),
		EditorView.updateListener.of((update: any) => {
			if (update.docChanged && !props.readonly) {
				const newValue = update.state.doc.toString();
				emit('update:modelValue', newValue);
			}
		}),
	];

	// Add readonly extension if needed
	if (props.readonly) {
		extensions.push(EditorState.readOnly.of(true));
	}

	// Create editor state
	const state = EditorState.create({
		doc: props.modelValue,
		extensions,
	});

	// Create editor view
	editorView = new EditorView({
		state,
		parent: editorContainer.value,
	});
};

// Update editor content when modelValue changes externally
watch(
	() => props.modelValue,
	(newValue) => {
		if (editorView) {
			const currentValue = editorView.state.doc.toString();
			if (currentValue !== newValue) {
				editorView.dispatch({
					changes: {
						from: 0,
						to: currentValue.length,
						insert: newValue,
					},
				});
			}
		}
	},
);

// Lifecycle hooks
onMounted(async () => {
	await nextTick();
	initEditor();
});

onBeforeUnmount(() => {
	if (editorView) {
		editorView.destroy();
		editorView = null;
	}
});
</script>

<style scoped lang="scss">
.code-editor-wrapper {
	width: 100%;
	display: flex;
	flex-direction: column;
	gap: var(--admin-spacing-sm);
}

.code-editor-container {
	width: 100%;
	border: 1px solid var(--admin-border-color);
	border-radius: var(--admin-border-radius);
	overflow: hidden;
	transition: border-color var(--admin-transition-fast);

	&:hover {
		border-color: var(--admin-primary);
	}

	&:focus-within {
		border-color: var(--admin-primary);
		box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
	}

	:deep(.cm-editor) {
		height: 100%;
	}

	:deep(.cm-scroller) {
		overflow: auto;
	}
}

.error-messages {
	display: flex;
	flex-direction: column;
	gap: var(--admin-spacing-xs);
}

.error-message {
	padding: var(--admin-spacing-xs) var(--admin-spacing-sm);
	background-color: rgba(245, 34, 45, 0.1);
	border-left: 3px solid var(--admin-error);
	border-radius: var(--admin-border-radius-sm);
	color: var(--admin-error);
	font-size: 13px;
	font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
}
</style>
