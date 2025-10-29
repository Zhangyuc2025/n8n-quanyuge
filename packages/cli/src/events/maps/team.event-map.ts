/**
 * 团队相关事件定义
 */

export type TeamEventPayload = {
	userId?: string;
	teamId: string;
	teamName?: string;
	ownerId?: string;
	changes?: Record<string, unknown>;
};

export type TeamMemberEventPayload = {
	userId?: string;
	teamId: string;
	operatorId?: string;
	addedUserId?: string;
	addedUserIds?: string[];
	userIds?: string[];
	removedUserId?: string;
	targetUserId?: string;
	role?: string;
	newRole?: string;
	count?: number;
};

export type TeamEventMap = {
	// 团队管理事件
	'team-created': TeamEventPayload;
	'team-updated': TeamEventPayload;
	'team-deleted': TeamEventPayload;
	'team-suspended': TeamEventPayload;
	'team-activated': TeamEventPayload;

	// Service 层内部事件（使用点分隔符）
	'team.created': TeamEventPayload;
	'team.updated': TeamEventPayload;
	'team.deleted': TeamEventPayload;
	'team.suspended': TeamEventPayload;
	'team.activated': TeamEventPayload;

	// 团队成员事件
	'team-member-added': TeamMemberEventPayload;
	'team-members-added-batch': TeamMemberEventPayload;
	'team-member-role-updated': TeamMemberEventPayload;
	'team-member-removed': TeamMemberEventPayload;

	// Service 层内部事件
	'team-member.added': TeamMemberEventPayload;
	'team-members.added': TeamMemberEventPayload;
	'team-member.role-updated': TeamMemberEventPayload;
	'team-member.removed': TeamMemberEventPayload;
};
