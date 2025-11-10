import type { SourceControlledFile } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { IWorkflowDb } from '@n8n/db';
import {
	FolderRepository,
	ProjectRepository,
	TagRepository,
	WorkflowRepository,
	WorkflowTagMappingRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { PROJECT_OWNER_ROLE_SLUG } from '@n8n/permissions';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { In } from '@n8n/typeorm';
import { rmSync } from 'fs';
import { InstanceSettings } from 'n8n-core';
import { UnexpectedError } from 'n8n-workflow';
import { rm as fsRm, writeFile as fsWriteFile } from 'node:fs/promises';
import path from 'path';

import { formatWorkflow } from '@/workflows/workflow.formatter';

import {
	SOURCE_CONTROL_GIT_FOLDER,
	SOURCE_CONTROL_PROJECT_EXPORT_FOLDER,
	SOURCE_CONTROL_TAGS_EXPORT_FILE,
	SOURCE_CONTROL_WORKFLOW_EXPORT_FOLDER,
} from './constants';
import {
	getFoldersPath,
	getProjectExportPath,
	getVariablesPath,
	getWorkflowExportPath,
	readFoldersFromSourceControlFile,
	readTagAndMappingsFromSourceControlFile,
	sourceControlFoldersExistCheck,
} from './source-control-helper.ee';
import { SourceControlScopedService } from './source-control-scoped.service';
import { VariablesService } from '../variables/variables.service.ee';
import type { ExportResult } from './types/export-result';
import { ExportableProject } from './types/exportable-project';
import type { ExportableWorkflow } from './types/exportable-workflow';
import type { RemoteResourceOwner } from './types/resource-owner';
import type { SourceControlContext } from './types/source-control-context';
import { ExportableVariable } from './types/exportable-variable';

@Service()
export class SourceControlExportService {
	private gitFolder: string;

	private workflowExportFolder: string;

	private projectExportFolder: string;

	constructor(
		private readonly logger: Logger,
		private readonly variablesService: VariablesService,
		private readonly tagRepository: TagRepository,
		private readonly projectRepository: ProjectRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly workflowTagMappingRepository: WorkflowTagMappingRepository,
		private readonly folderRepository: FolderRepository,
		private readonly sourceControlScopedService: SourceControlScopedService,
		instanceSettings: InstanceSettings,
	) {
		this.gitFolder = path.join(instanceSettings.n8nFolder, SOURCE_CONTROL_GIT_FOLDER);
		this.workflowExportFolder = path.join(this.gitFolder, SOURCE_CONTROL_WORKFLOW_EXPORT_FOLDER);
		this.projectExportFolder = path.join(this.gitFolder, SOURCE_CONTROL_PROJECT_EXPORT_FOLDER);
	}

	getWorkflowPath(workflowId: string): string {
		return getWorkflowExportPath(workflowId, this.workflowExportFolder);
	}

	async deleteRepositoryFolder() {
		try {
			await fsRm(this.gitFolder, { recursive: true });
		} catch (error) {
			this.logger.error(`Failed to delete work folder: ${(error as Error).message}`);
		}
	}

	rmFilesFromExportFolder(filesToBeDeleted: Set<string>): Set<string> {
		try {
			filesToBeDeleted.forEach((e) => rmSync(e));
		} catch (error) {
			this.logger.error(`Failed to delete workflows from work folder: ${(error as Error).message}`);
		}
		return filesToBeDeleted;
	}

	private async writeExportableWorkflowsToExportFolder(
		workflowsToBeExported: IWorkflowDb[],
		owners: Record<string, RemoteResourceOwner>,
	) {
		await Promise.all(
			workflowsToBeExported.map(async (e) => {
				const fileName = this.getWorkflowPath(e.id);
				const sanitizedWorkflow: ExportableWorkflow = {
					id: e.id,
					name: e.name,
					nodes: e.nodes,
					connections: e.connections,
					settings: e.settings,
					triggerCount: e.triggerCount,
					versionId: e.versionId,
					owner: owners[e.id],
					parentFolderId: e.parentFolder?.id ?? null,
					isArchived: e.isArchived,
				};
				this.logger.debug(`Writing workflow ${e.id} to ${fileName}`);
				return await fsWriteFile(fileName, JSON.stringify(sanitizedWorkflow, null, 2));
			}),
		);
	}

	async exportWorkflowsToWorkFolder(candidates: SourceControlledFile[]): Promise<ExportResult> {
		try {
			sourceControlFoldersExistCheck([this.workflowExportFolder]);
			const workflowIds = candidates.map((e) => e.id);
			const workflows = await this.workflowRepository.find({
				where: { id: In(workflowIds) },
				relations: [
					'parentFolder',
					'project',
					'project.projectRelations',
					'project.projectRelations.role',
					'project.projectRelations.user',
				],
			});

			// determine owner of each workflow to be exported
			const owners: Record<string, RemoteResourceOwner> = {};
			workflows.forEach((workflow) => {
				const project = workflow.project;

				if (!project) {
					throw new UnexpectedError(`Workflow ${formatWorkflow(workflow)} has no owner`);
				}

				if (project.type === 'personal') {
					const ownerRelation = project.projectRelations.find(
						(pr) => pr.role.slug === PROJECT_OWNER_ROLE_SLUG,
					);
					if (!ownerRelation) {
						throw new UnexpectedError(`Workflow ${formatWorkflow(workflow)} has no owner`);
					}
					owners[workflow.id] = {
						type: 'personal',
						projectId: project.id,
						projectName: project.name,
						personalEmail: ownerRelation.user.email,
					};
				} else if (project.type === 'team') {
					owners[workflow.id] = {
						type: 'team',
						teamId: project.id,
						teamName: project.name,
					};
				} else {
					throw new UnexpectedError(
						`Workflow belongs to unknown project type: ${project.type as string}`,
					);
				}
			});

			// write the workflows to the export folder as json files
			await this.writeExportableWorkflowsToExportFolder(workflows, owners);

			// await fsWriteFile(ownersFileName, JSON.stringify(owners, null, 2));
			return {
				count: workflows.length,
				folder: this.workflowExportFolder,
				files: workflows.map((e) => ({
					id: e?.id,
					name: this.getWorkflowPath(e?.name),
				})),
			};
		} catch (error) {
			if (error instanceof UnexpectedError) throw error;
			throw new UnexpectedError('Failed to export workflows to work folder', { cause: error });
		}
	}

	async exportGlobalVariablesToWorkFolder(): Promise<ExportResult> {
		try {
			sourceControlFoldersExistCheck([this.gitFolder]);
			const variables = await this.variablesService.getAllCached({ globalOnly: true });
			// do not export empty variables
			if (variables.length === 0) {
				return {
					count: 0,
					folder: this.gitFolder,
					files: [],
				};
			}
			const fileName = getVariablesPath(this.gitFolder);
			const sanitizedVariables: ExportableVariable[] = variables.map((e) => ({
				id: e.id,
				key: e.key,
				type: e.type,
				value: '',
			}));
			await fsWriteFile(fileName, JSON.stringify(sanitizedVariables, null, 2));
			return {
				count: sanitizedVariables.length,
				folder: this.gitFolder,
				files: [
					{
						id: '',
						name: fileName,
					},
				],
			};
		} catch (error) {
			this.logger.error('Failed to export variables to work folder', { error });
			throw new UnexpectedError('Failed to export variables to work folder', {
				cause: error,
			});
		}
	}

	async exportFoldersToWorkFolder(context: SourceControlContext): Promise<ExportResult> {
		try {
			sourceControlFoldersExistCheck([this.gitFolder]);
			const folders = await this.folderRepository.find({
				relations: ['parentFolder', 'homeProject'],
				select: {
					id: true,
					name: true,
					createdAt: true,
					updatedAt: true,
					parentFolder: {
						id: true,
					},
					homeProject: {
						id: true,
					},
				},
				where: this.sourceControlScopedService.getFoldersInAdminProjectsFromContextFilter(context),
			});

			if (folders.length === 0) {
				return {
					count: 0,
					folder: this.gitFolder,
					files: [],
				};
			}

			const allowedProjects =
				await this.sourceControlScopedService.getAuthorizedProjectsFromContext(context);

			const fileName = getFoldersPath(this.gitFolder);

			const existingFolders = await readFoldersFromSourceControlFile(fileName);

			// keep all folders that are not accessible by the current user
			// if allowedProjects is undefined, all folders are accessible by the current user
			const foldersToKeepUnchanged = context.hasAccessToAllProjects()
				? []
				: existingFolders.folders.filter((folder) => {
						return !allowedProjects.some((project) => project.id === folder.homeProjectId);
					});

			const newFolders = foldersToKeepUnchanged.concat(
				...folders.map((f) => ({
					id: f.id,
					name: f.name,
					parentFolderId: f.parentFolder?.id ?? null,
					homeProjectId: f.homeProject.id,
					createdAt: f.createdAt.toISOString(),
					updatedAt: f.updatedAt.toISOString(),
				})),
			);

			await fsWriteFile(
				fileName,
				JSON.stringify(
					{
						folders: newFolders,
					},
					null,
					2,
				),
			);
			return {
				count: folders.length,
				folder: this.gitFolder,
				files: [
					{
						id: '',
						name: fileName,
					},
				],
			};
		} catch (error) {
			this.logger.error('Failed to export folders to work folder', { error });
			throw new UnexpectedError('Failed to export folders to work folder', { cause: error });
		}
	}

	async exportTagsToWorkFolder(context: SourceControlContext): Promise<ExportResult> {
		try {
			const fileName = path.join(this.gitFolder, SOURCE_CONTROL_TAGS_EXPORT_FILE);
			sourceControlFoldersExistCheck([this.gitFolder]);
			const tags = await this.tagRepository.find();

			if (tags.length === 0) {
				await fsWriteFile(fileName, JSON.stringify({ tags: [], mappings: [] }, null, 2));

				return {
					count: 0,
					folder: this.gitFolder,
					files: [{ id: '', name: fileName }],
				};
			}

			const mappingsOfAllowedWorkflows = await this.workflowTagMappingRepository.find({
				where:
					this.sourceControlScopedService.getWorkflowTagMappingInAdminProjectsFromContextFilter(
						context,
					),
			});

			const allowedWorkflows = await this.workflowRepository.find({
				where:
					this.sourceControlScopedService.getWorkflowsInAdminProjectsFromContextFilter(context),
			});

			const existingTagsAndMapping = await readTagAndMappingsFromSourceControlFile(fileName);

			// keep all mappings that are not accessible by the current user
			const mappingsToKeep = existingTagsAndMapping.mappings.filter((mapping) => {
				return !allowedWorkflows.some(
					(allowedWorkflow) => allowedWorkflow.id === mapping.workflowId,
				);
			});

			await fsWriteFile(
				fileName,
				JSON.stringify(
					{
						// overwrite all tags
						tags: tags.map((tag) => ({ id: tag.id, name: tag.name })),
						mappings: mappingsToKeep.concat(mappingsOfAllowedWorkflows),
					},
					null,
					2,
				),
			);
			return {
				count: tags.length,
				folder: this.gitFolder,
				files: [{ id: '', name: fileName }],
			};
		} catch (error) {
			this.logger.error('Failed to export tags to work folder', { error });
			throw new UnexpectedError('Failed to export tags to work folder', { cause: error });
		}
	}

	/**
	 * Credential import/export is no longer supported in Source Control.
	 * Enterprise Git integration now focuses on workflow synchronization only.
	 * Credentials should be managed through other secure mechanisms.
	 */
	async exportCredentialsToWorkFolder(_candidates: SourceControlledFile[]): Promise<ExportResult> {
		this.logger.warn(
			'Credential export is no longer supported. Skipping credential export operation.',
		);
		return {
			count: 0,
			folder: '',
			files: [],
		};
	}

	/**
	 * Writes candidates projects to files in the work folder.
	 *
	 * Only team projects are supported.
	 * Personal project are not supported because they are not stable across instances
	 * (different ids across instances).
	 */
	async exportTeamProjectsToWorkFolder(candidates: SourceControlledFile[]): Promise<ExportResult> {
		try {
			sourceControlFoldersExistCheck([this.projectExportFolder], true);

			const projectIds = candidates.map((e) => e.id);
			const projects = await this.projectRepository.find({
				where: { id: In(projectIds), type: 'team' },
				relations: ['variables'],
			});

			await Promise.all(
				projects.map(async (project) => {
					const fileName = getProjectExportPath(project.id, this.projectExportFolder);

					const sanitizedProject: ExportableProject = {
						id: project.id,
						name: project.name,
						icon: project.icon,
						description: project.description,
						type: 'team',
						owner: {
							type: 'team',
							teamId: project.id,
							teamName: project.name,
						},
						variableStubs: project.variables.map((variable) => ({
							id: variable.id,
							key: variable.key,
							type: variable.type,
							value: '',
						})),
					};

					this.logger.debug(`Writing project ${project.id} to ${fileName}`);
					return await fsWriteFile(fileName, JSON.stringify(sanitizedProject, null, 2));
				}),
			);

			return {
				count: projects.length,
				folder: this.projectExportFolder,
				files: projects.map((project) => ({
					id: project.id,
					name: getProjectExportPath(project.id, this.projectExportFolder),
				})),
			};
		} catch (error) {
			if (error instanceof UnexpectedError) throw error;
			throw new UnexpectedError('Failed to export projects to work folder', { cause: error });
		}
	}
}
