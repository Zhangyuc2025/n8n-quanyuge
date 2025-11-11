import { z } from 'zod';
import { Z } from 'zod-class';

import {
	projectDescriptionSchema,
	projectIconSchema,
	projectNameSchema,
	projectRelationSchema,
	billingModeSchema,
} from '../../schemas/project.schema';

const updateProjectShape = {
	name: projectNameSchema.optional(),
	icon: projectIconSchema.optional(),
	description: projectDescriptionSchema.optional(),
	billingMode: billingModeSchema.optional(),
};

export class UpdateProjectDto extends Z.class(updateProjectShape) {}

export class UpdateProjectWithRelationsDto extends Z.class({
	...updateProjectShape,
	relations: z.array(projectRelationSchema).optional(),
}) {}
