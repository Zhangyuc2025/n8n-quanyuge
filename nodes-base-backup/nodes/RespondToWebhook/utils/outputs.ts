export const configuredOutputs = (
	version: number,
	parameters: { enableResponseOutput?: boolean },
) => {
	const multipleOutputs = version === 1.3 || (version >= 1.4 && parameters.enableResponseOutput);
	if (multipleOutputs) {
		return [
			{
				type: 'main',
				displayName: '输入数据',
			},
			{
				type: 'main',
				displayName: '响应',
			},
		];
	}

	return ['main'];
};
