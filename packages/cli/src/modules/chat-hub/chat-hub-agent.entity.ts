import { ChatHubProvider } from '@n8n/api-types';
import { WithTimestamps, User, PlatformAIProvider, Project } from '@n8n/db';
import {
	Column,
	Entity,
	ManyToOne,
	JoinColumn,
	PrimaryGeneratedColumn,
	type Relation,
} from '@n8n/typeorm';

@Entity({ name: 'chat_hub_agents' })
export class ChatHubAgent extends WithTimestamps {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	/**
	 * The name of the chat agent.
	 */
	@Column({ type: 'varchar', length: 128 })
	name: string;

	/**
	 * The description of the chat agent (optional).
	 */
	@Column({ type: 'varchar', length: 512, nullable: true })
	description: string | null;

	/**
	 * The system prompt for the chat agent.
	 */
	@Column({ type: 'text' })
	systemPrompt: string;

	/**
	 * ID of the user that owns this chat agent.
	 */
	@Column({ type: String })
	ownerId: string;

	/**
	 * The user that owns this chat agent.
	 */
	@ManyToOne('User', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'ownerId' })
	owner?: User;

	/**
	 * Project ID (workspace) that owns this chat agent.
	 * Required for multi-tenant isolation.
	 */
	@Column({ type: String, name: 'projectId' })
	projectId: string;

	/**
	 * Project (workspace) that owns this chat agent.
	 */
	@ManyToOne('Project', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'projectId' })
	project?: Relation<Project>;

	/*
	 * Enum value of the LLM provider to use, e.g. 'openai', 'anthropic', 'google', 'n8n' (if applicable).
	 */
	@Column({ type: 'varchar', length: 16, nullable: true })
	provider: ChatHubProvider;

	/*
	 * LLM model to use from the provider (if applicable)
	 */
	@Column({ type: 'varchar', length: 64, nullable: true })
	model: string;

	/**
	 * Platform AI Provider key for pay-per-use authentication (optional).
	 * If provided, uses platform-managed API key for billing and authentication.
	 * This is the primary method for AI model authentication in the multi-tenant architecture.
	 */
	@Column({ type: 'varchar', length: 100, nullable: true, name: 'platform_ai_provider_key' })
	platformAiProviderKey: string | null;

	/**
	 * Relationship to Platform AI Provider (optional).
	 * Used for accessing platform-managed API keys and billing configuration.
	 */
	@ManyToOne(() => PlatformAIProvider, { nullable: true })
	@JoinColumn({ name: 'platform_ai_provider_key', referencedColumnName: 'providerKey' })
	platformAiProvider?: PlatformAIProvider | null;
}
