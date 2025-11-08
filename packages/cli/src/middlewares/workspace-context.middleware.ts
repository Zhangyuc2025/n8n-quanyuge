import type { AuthenticatedRequest, Project } from '@n8n/db';
import { Service } from '@n8n/di';
import type { Response, NextFunction } from 'express';
import { WorkspaceContextService } from '@/services/workspace-context.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';

// 扩展 Express Request 类型定义
declare module 'express' {
	interface Request {
		workspaceContext?: {
			workspaceId: string;
			workspace: Project;
		};
	}
}

/**
 * 工作空间上下文中间件
 *
 * 从 HTTP Header 中提取工作空间 ID，验证用户权限，并将工作空间上下文注入到请求对象中。
 *
 * 功能：
 * 1. 从 X-Workspace-Id header 提取工作空间 ID
 * 2. 验证 ID 格式是否为有效的 UUID
 * 3. 验证当前用户是否属于该工作空间
 * 4. 将工作空间信息注入到 req.workspaceContext 中
 *
 * @throws {BadRequestError} 当缺少 header 或格式无效时
 * @throws {ForbiddenError} 当用户没有访问权限时
 */
@Service()
export class WorkspaceContextMiddleware {
	// UUID v4 正则表达式
	private readonly UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

	constructor(private readonly workspaceContextService: WorkspaceContextService) {}

	/**
	 * 获取中间件处理函数
	 *
	 * @returns Express 中间件函数
	 */
	getMiddleware() {
		return async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
			try {
				// 1. 提取 X-Workspace-Id header
				const workspaceId = req.headers['x-workspace-id'];

				// 验证 header 是否存在
				if (!workspaceId) {
					throw new BadRequestError('缺少 X-Workspace-Id header');
				}

				// 验证 header 类型（应该是字符串）
				if (typeof workspaceId !== 'string') {
					throw new BadRequestError('X-Workspace-Id 格式无效');
				}

				// 2. 验证 UUID 格式
				if (!this.UUID_REGEX.test(workspaceId)) {
					throw new BadRequestError('X-Workspace-Id 格式无效');
				}

				// 3. 验证用户权限
				// 检查用户是否属于该工作空间
				const isUserInWorkspace = await this.workspaceContextService.isUserInWorkspace(
					req.user.id,
					workspaceId,
				);

				if (!isUserInWorkspace) {
					throw new ForbiddenError('您没有访问此工作空间的权限');
				}

				// 4. 获取工作空间详细信息并注入到请求对象
				const workspace = await this.workspaceContextService.getWorkspaceByProjectId(workspaceId);

				req.workspaceContext = {
					workspaceId,
					workspace,
				};

				// 继续处理下一个中间件
				next();
			} catch (error) {
				// 将错误传递给 Express 错误处理中间件
				next(error);
			}
		};
	}
}
