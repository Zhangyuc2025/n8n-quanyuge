import {
	User,
	CredentialsRepository,
	WorkflowRepository,
	ProjectRepository,
	SettingsRepository,
	UserRepository,
	GLOBAL_OWNER_ROLE,
} from '@n8n/db';
import { Command } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { BaseCommand } from '../base-command';

const defaultUserProps = {
	firstName: null,
	lastName: null,
	email: null,
	password: null,
	role: 'global:owner',
};

@Command({
	name: 'user-management:reset',
	description: 'Resets the database to the default user state',
})
export class Reset extends BaseCommand {
	/**
	 * [PLAN_A 独占模式] 重置数据库到默认用户状态
	 * - 将所有工作流和凭据的 projectId 设置为 owner 的个人项目
	 * - 删除除 owner 外的所有用户
	 */
	async run(): Promise<void> {
		const owner = await this.getInstanceOwner();
		const personalProject = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
			owner.id,
		);

		// 将所有工作流和凭据转移到 owner 的个人项目
		await Container.get(WorkflowRepository).update({}, { projectId: personalProject.id });
		await Container.get(CredentialsRepository).update({}, { projectId: personalProject.id });

		// 删除除 owner 外的所有用户
		await Container.get(UserRepository).deleteAllExcept(owner);
		await Container.get(UserRepository).save(Object.assign(owner, defaultUserProps));

		// 重置 instance owner 设置
		await Container.get(SettingsRepository).update(
			{ key: 'userManagement.isInstanceOwnerSetUp' },
			{ value: 'false' },
		);

		this.logger.info('Successfully reset the database to default user state.');
	}

	async getInstanceOwner(): Promise<User> {
		const owner = await Container.get(UserRepository).findOneBy({
			role: { slug: GLOBAL_OWNER_ROLE.slug },
		});

		if (owner) return owner;

		const user = new User();

		Object.assign(user, defaultUserProps);

		await Container.get(UserRepository).save(user);

		return await Container.get(UserRepository).findOneByOrFail({
			role: { slug: GLOBAL_OWNER_ROLE.slug },
		});
	}

	async catch(error: Error): Promise<void> {
		this.logger.error('Error resetting database. See log messages for details.');
		this.logger.error(error.message);
		process.exit(1);
	}
}
