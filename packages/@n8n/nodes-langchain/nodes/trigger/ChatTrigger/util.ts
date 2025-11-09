import { NodeOperationError, UserError, WAIT_INDEFINITELY } from 'n8n-workflow';
import type { IExecuteFunctions } from 'n8n-workflow';

export function configureWaitTillDate(context: IExecuteFunctions) {
	let waitTill = WAIT_INDEFINITELY;

	const limitOptions = context.getNodeParameter('options.limitWaitTime.values', 0, {}) as {
		limitType?: string;
		resumeAmount?: number;
		resumeUnit?: string;
		maxDateAndTime?: string;
	};

	if (Object.keys(limitOptions).length) {
		try {
			if (limitOptions.limitType === 'afterTimeInterval') {
				let waitAmount = limitOptions.resumeAmount as number;

				if (limitOptions.resumeUnit === 'minutes') {
					waitAmount *= 60;
				}
				if (limitOptions.resumeUnit === 'hours') {
					waitAmount *= 60 * 60;
				}
				if (limitOptions.resumeUnit === 'days') {
					waitAmount *= 60 * 60 * 24;
				}

				waitAmount *= 1000;
				waitTill = new Date(new Date().getTime() + waitAmount);
			} else {
				waitTill = new Date(limitOptions.maxDateAndTime as string);
			}

			if (isNaN(waitTill.getTime())) {
				throw new UserError('无效的日期格式');
			}
		} catch (error) {
			throw new NodeOperationError(context.getNode(), '无法配置限制等待时间', {
				description: error.message,
			});
		}
	}

	return waitTill;
}

export const configureInputs = (parameters: { options?: { memoryConnection?: boolean } }) => {
	const inputs = [
		{
			type: 'main',
			displayName: '用户响应',
		},
	];
	if (parameters.options?.memoryConnection) {
		return [
			...inputs,
			{
				type: 'ai_memory',
				displayName: '记忆',
				maxConnections: 1,
			},
		];
	}

	return inputs;
};
