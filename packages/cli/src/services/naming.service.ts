import { WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';

@Service()
export class NamingService {
	constructor(private readonly workflowRepository: WorkflowRepository) {}

	async getUniqueWorkflowName(requestedName: string) {
		return await this.getUniqueName(requestedName);
	}

	private async getUniqueName(requestedName: string) {
		const found = await this.workflowRepository.findStartingWith(requestedName);

		if (found.length === 0) return requestedName;

		if (found.length === 1) return [requestedName, 2].join(' ');

		const maxSuffix = found.reduce((max, { name }) => {
			const [_, strSuffix] = name.split(`${requestedName} `);

			const numSuffix = parseInt(strSuffix);

			if (isNaN(numSuffix)) return max;

			if (numSuffix > max) max = numSuffix;

			return max;
		}, 2);

		return [requestedName, maxSuffix + 1].join(' ');
	}
}
