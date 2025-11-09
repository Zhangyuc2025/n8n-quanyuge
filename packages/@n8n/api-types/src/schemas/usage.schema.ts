import { z } from 'zod';

export const usageStateSchema = z.object({
	loading: z.boolean(),
	data: z.object({
		usage: z.object({
			activeWorkflowTriggers: z.object({
				limit: z.number(), // -1 for unlimited
				value: z.number(),
				warningThreshold: z.number(),
			}),
			// workflowsHavingEvaluations 保留用于向后兼容，但前端不再使用
			workflowsHavingEvaluations: z.object({
				limit: z.number(), // -1 for unlimited (license system removed)
				value: z.number(),
			}),
		}),
		// license 字段保留用于向后兼容，但前端不再使用
		license: z.object({
			planId: z.string(),
			planName: z.string(),
		}),
		managementToken: z.string().optional(),
	}),
});

export type UsageState = z.infer<typeof usageStateSchema>;
