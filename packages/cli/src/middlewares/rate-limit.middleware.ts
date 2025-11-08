import type { Request, Response, NextFunction } from 'express';
import { Service } from '@n8n/di';
import { TooManyRequestsError } from '@/errors/response-errors/too-many-requests.error';

// 导入工作空间上下文类型扩展
import type {} from './workspace-context.middleware';

/**
 * 速率限制配置接口
 */
interface RateLimitConfig {
	/** 最大请求数 */
	maxRequests: number;
	/** 时间窗口（毫秒） */
	windowMs: number;
}

/**
 * 速率限制数据结构
 */
interface RateLimitData {
	/** 当前计数 */
	count: number;
	/** 重置时间戳（毫秒） */
	resetTime: number;
}

/**
 * 速率限制中间件
 *
 * 基于工作空间的 API 速率限制，防止恶意请求和保护平台资源。
 *
 * 功能特性：
 * 1. 每个工作空间独立计数
 * 2. 使用滑动窗口算法
 * 3. 默认限制：每分钟 100 次请求
 * 4. 返回标准的速率限制 HTTP headers
 * 5. 超限时返回 429 Too Many Requests
 *
 * 实现细节：
 * - 使用内存存储（Map 结构）
 * - 自动清理过期数据（每 5 分钟）
 * - 滑动窗口实现：超过 resetTime 时重置计数器
 *
 * 注意事项：
 * - 这是生产环境的简化实现，使用内存存储
 * - TODO: 生产环境建议使用 Redis 等分布式存储，以支持多实例部署
 * - TODO: 考虑实现更细粒度的限制策略（如按端点、按操作类型）
 */
@Service()
export class RateLimitMiddleware {
	/**
	 * 存储格式：Map<workspaceId, RateLimitData>
	 * 每个工作空间独立计数和重置时间
	 */
	private readonly rateLimitStore = new Map<string, RateLimitData>();

	/**
	 * 清理定时器
	 * 用于定期清理过期的速率限制记录
	 */
	private cleanupInterval?: NodeJS.Timeout;

	constructor() {
		// 启动定期清理任务：每 5 分钟清理一次过期记录
		this.startCleanupTask();
	}

	/**
	 * 创建速率限制中间件
	 *
	 * @param config - 可选的速率限制配置
	 * @returns Express RequestHandler
	 */
	createMiddleware(
		config?: RateLimitConfig,
	): (req: Request, res: Response, next: NextFunction) => void {
		// 默认配置：60 秒内最多 100 次请求
		const { maxRequests = 100, windowMs = 60 * 1000 } = config ?? {};

		return (req: Request, res: Response, next: NextFunction) => {
			// 检查是否存在工作空间上下文
			// 如果没有，跳过限制（WorkspaceContextMiddleware 会处理缺少上下文的情况）
			const workspaceContext = req.workspaceContext;
			if (!workspaceContext || !workspaceContext.workspaceId) {
				return next();
			}

			// 确保 workspaceId 是字符串类型
			const workspaceId = String(workspaceContext.workspaceId);
			const now = Date.now();

			// 获取或初始化该工作空间的速率限制数据
			let limitData = this.rateLimitStore.get(workspaceId);

			if (!limitData || now >= limitData.resetTime) {
				// 初始化或重置计数器
				limitData = {
					count: 0,
					resetTime: now + windowMs,
				};
				this.rateLimitStore.set(workspaceId, limitData);
			}

			// 增加请求计数
			limitData.count++;

			// 计算剩余请求数
			const remaining = Math.max(0, maxRequests - limitData.count);

			// 计算重置时间（秒）
			const resetTime = Math.ceil((limitData.resetTime - now) / 1000);

			// 设置速率限制响应 headers
			res.setHeader('X-RateLimit-Limit', String(maxRequests));
			res.setHeader('X-RateLimit-Remaining', String(remaining));
			res.setHeader('X-RateLimit-Reset', String(limitData.resetTime));

			// 检查是否超限
			if (limitData.count > maxRequests) {
				// 设置 Retry-After header（秒）
				res.setHeader('Retry-After', String(resetTime));

				// 计算窗口秒数用于错误消息
				const windowSeconds = Math.floor(windowMs / 1000);

				// 返回 429 错误
				throw new TooManyRequestsError(
					`请求过于频繁，请在 ${String(resetTime)} 秒后重试`,
					`当前工作空间已达到速率限制（每 ${String(windowSeconds)} 秒最多 ${String(maxRequests)} 次请求）`,
				);
			}

			// 继续处理下一个中间件
			next();
		};
	}

	/**
	 * 启动定期清理任务
	 *
	 * 每 5 分钟清理一次过期的速率限制记录，避免内存泄漏
	 */
	private startCleanupTask(): void {
		// 清理间隔：5 分钟
		const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

		this.cleanupInterval = setInterval(() => {
			const now = Date.now();

			// 遍历所有记录，删除已过期的
			// 使用 Array.from 转换 Iterator，避免 downlevelIteration 问题
			const entries = Array.from(this.rateLimitStore.entries());
			for (const [workspaceId, limitData] of entries) {
				if (now >= limitData.resetTime) {
					this.rateLimitStore.delete(workspaceId);
				}
			}
		}, CLEANUP_INTERVAL_MS);

		// 确保 Node.js 进程可以正常退出
		this.cleanupInterval.unref();
	}

	/**
	 * 停止清理任务
	 *
	 * 主要用于测试或服务关闭时清理资源
	 */
	stopCleanupTask(): void {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
			this.cleanupInterval = undefined;
		}
	}

	/**
	 * 清空所有速率限制记录
	 *
	 * 主要用于测试或重置场景
	 */
	clear(): void {
		this.rateLimitStore.clear();
	}

	/**
	 * 获取指定工作空间的当前速率限制状态
	 *
	 * 主要用于监控和调试
	 *
	 * @param workspaceId - 工作空间 ID
	 * @returns 速率限制数据，如果不存在则返回 undefined
	 */
	getStatus(workspaceId: string): RateLimitData | undefined {
		return this.rateLimitStore.get(workspaceId);
	}
}
