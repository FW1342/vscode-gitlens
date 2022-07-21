import { Disposable, ViewColumn, window } from 'vscode';
import { configuration } from '../../../configuration';
import { Commands } from '../../../constants';
import type { Container } from '../../../container';
import {
	GitCommit as GitCommitModel,
	GitLog,
	GitStashCommit,
	Repository,
	RepositoryChangeEvent
} from '../../../git/models';
import { RepositoryPicker } from '../../../quickpicks/repositoryPicker';
import { WorkspaceStorageKeys } from '../../../storage';
import { IpcMessage, onIpc } from '../../../webviews/protocol';
import { WebviewWithConfigBase } from '../../../webviews/webviewWithConfigBase';
import { ensurePlusFeaturesEnabled } from '../../subscription/utils';
import {
	ColumnChangeCommandType,
	DidChangeCommitsNotificationType,
	DidChangeConfigNotificationType,
	DidChangeNotificationType,
	GitBranch,
	GitCommit,
	GitRemote,
	GitTag,
	GraphColumnConfig,
	GraphColumnConfigDictionary,
	GraphConfig as GraphConfigWithColumns,
	MoreCommitsCommandType,
	Repository as RepositoryData,
	SelectRepositoryCommandType,
	State,
} from './protocol';

export class GraphWebview extends WebviewWithConfigBase<State> {
	private selectedRepository?: Repository;
	private currentLog?: GitLog;
	private repoDisposable: Disposable | undefined;
	private defaultTitle?: string;

	constructor(container: Container) {
		super(container, 'gitlens.graph', 'graph.html', 'images/gitlens-icon.png', 'Graph', Commands.ShowGraphPage);
		this.defaultTitle = this.title;
		this.disposables.push({ dispose: () => this.repoDisposable?.dispose() });
	}

	override async show(column: ViewColumn = ViewColumn.Active): Promise<void> {
		if (!(await ensurePlusFeaturesEnabled())) return;
		return super.show(column);
	}

	protected override onMessageReceived(e: IpcMessage) {
		switch (e.method) {
			case ColumnChangeCommandType.method:
				onIpc(ColumnChangeCommandType, e, params => this.changeColumn(params.name, params.config));
				break;
			case MoreCommitsCommandType.method:
				onIpc(MoreCommitsCommandType, e, params => this.moreCommits(params.limit));
				break;
			case SelectRepositoryCommandType.method:
				onIpc(SelectRepositoryCommandType, e, params => this.changeRepository(params.path));
				break;
		}
	}

	private changeColumn(name: string, config: GraphColumnConfig) {
		const columns =
			this.container.storage.getWorkspace<GraphColumnConfigDictionary>(WorkspaceStorageKeys.GraphColumns) ?? {};
		columns[name] = config;
		void this.container.storage.storeWorkspace<GraphColumnConfigDictionary>(
			WorkspaceStorageKeys.GraphColumns,
			columns,
		);
		void this.notifyDidChangeConfig();
	}

	private async moreCommits(limit?: number) {
		if (this.currentLog?.more !== undefined) {
			const { defaultLimit, pageLimit } = this.getConfig();
			const nextLog = await this.currentLog.more(limit ?? pageLimit ?? defaultLimit);
			console.log('GraphWebview moreCommits', nextLog);
			if (nextLog !== undefined) {
				this.currentLog = nextLog;
			}
		}
		void this.notifyDidChangeCommits();
	}

	private changeRepository(path: string) {
		if (this.selectedRepository?.path !== path) {
			this.selectedRepository = path ? this.getRepos().find(r => r.path === path) : undefined;
			this.currentLog = undefined;
		}
		void this.notifyDidChangeState();
	}

	private async notifyDidChangeConfig() {
		return this.notify(DidChangeConfigNotificationType, {
			config: this.getConfig(),
		});
	}

	private async notifyDidChangeCommits() {
		const commitsAndLog = await this.getCommits();

		return this.notify(DidChangeCommitsNotificationType, {
			commits: formatCommits(commitsAndLog?.commits ?? []),
			log: commitsAndLog?.log != null ? formatLog(commitsAndLog.log) : undefined,
		});
	}

	private async notifyDidChangeState() {
		return this.notify(DidChangeNotificationType, {
			state: await this.getState(),
		});
		// return window.withProgress({ location: { viewId: this.id } }, async () => {
		// 	void this.notify(DidChangeNotificationType, {
		// 		state: await this.getState(),
		// 	});
		// });
	}

	private getRepos(): Repository[] {
		return this.container.git.openRepositories;
	}

	private async getLog(repo: string | Repository): Promise<GitLog | undefined> {
		const repository = typeof repo === 'string' ? this.container.git.getRepository(repo) : repo;
		if (repository === undefined) {
			return undefined;
		}

		const { defaultLimit, pageLimit } = this.getConfig();
		return this.container.git.getLog(repository.uri, {
			limit: pageLimit ?? defaultLimit,
		});
	}

	private async getCommits(): Promise<{ log: GitLog; commits: GitCommit[] } | undefined> {
		if (this.selectedRepository === undefined) {
			return undefined;
		}

		if (this.currentLog === undefined) {
			const log = await this.getLog(this.selectedRepository);
			if (log?.commits === undefined) {
				return undefined;
			}
			this.currentLog = log;
		}

		if (this.currentLog?.commits === undefined) {
			return undefined;
		}

		return {
			log: this.currentLog,
			commits: Array.from(this.currentLog.commits.values()),
		};
	}

	private async getRemotes(): Promise<GitRemote[] | undefined> {
		if (this.selectedRepository === undefined) {
			return undefined;
		}

		return this.selectedRepository.getRemotes();
	}

	private async getTags(): Promise<GitTag[] | undefined> {
		if (this.selectedRepository === undefined) {
			return undefined;
		}

		const tags = await this.container.git.getTags(this.selectedRepository.uri);
		if (tags === undefined) {
			return undefined;
		}

		return Array.from(tags.values);
	}

	private async getBranches(): Promise<GitBranch[] | undefined> {
		if (this.selectedRepository === undefined) {
			return undefined;
		}

		const branches = await this.container.git.getBranches(this.selectedRepository.uri);
		if (branches === undefined) {
			return undefined;
		}

		return Array.from(branches.values);
	}

	private async getStashCommits(): Promise<GitStashCommit[] | undefined> {
		if (this.selectedRepository === undefined) {
			return undefined;
		}

		const stash = await this.container.git.getStash(this.selectedRepository.uri);
		if (stash === undefined || stash.commits === undefined) {
			return undefined;
		}

		return Array.from(stash?.commits?.values());
	}

	private async pickRepository(repositories: Repository[]): Promise<Repository | undefined> {
		if (repositories.length === 0) {
			return undefined;
		}

		if (repositories.length === 1) {
			return repositories[0];
		}

		const repoPath = (
			await RepositoryPicker.getBestRepositoryOrShow(
				undefined,
				window.activeTextEditor,
				'Choose a repository to visualize',
			)
		)?.path;

		return repositories.find(r => r.path === repoPath);
	}

	private getConfig(): GraphConfigWithColumns {
		const settings = configuration.get('graph');
		return {
			...settings,
			columns: this.container.storage.getWorkspace<GraphColumnConfigDictionary>(
				WorkspaceStorageKeys.GraphColumns,
			),
		};
	}

	private onRepositoryChanged(e: RepositoryChangeEvent) {
		// TODO: e.changed(RepositoryChange.Heads)
		this.currentLog = undefined;
		void this.notifyDidChangeState();
	}

	private async getState(): Promise<State> {
		const repositories = this.getRepos();
		if (repositories.length === 0) {
			return {
				repositories: [],
			};
		}

		if (this.selectedRepository === undefined) {
			const idealRepo = await this.pickRepository(repositories);
			this.selectedRepository = idealRepo;
			this.repoDisposable?.dispose();
			if (this.selectedRepository != null) {
				this.repoDisposable = this.selectedRepository.onDidChange(this.onRepositoryChanged, this);
			}
		}

		if (this.selectedRepository !== undefined) {
			this.title = `${this.defaultTitle}: ${this.selectedRepository.formattedName}`;
		}

		const [commitsAndLog, remotes, tags, branches, stashCommits] = await Promise.all([
			this.getCommits(),
			this.getRemotes(),
			this.getTags(),
			this.getBranches(),
			this.getStashCommits()
		]);

		const log = commitsAndLog?.log;
		const filteredStashCommits = filterStashCommits(stashCommits, log);
		const commits = [...(commitsAndLog?.commits ?? []), ...(filteredStashCommits ?? [])];

		return {
			repositories: formatRepositories(repositories),
			selectedRepository: this.selectedRepository?.path,
			commits: formatCommits(commits),
			remotes: remotes, // TODO: add a format function
			branches: branches, // TODO: add a format function
			tags: tags, // TODO: add a format function
			config: this.getConfig(),
			log: log != null ? formatLog(log) : undefined,
			nonce: super.getCSPNonce(),
		};
	}

	protected override async includeBootstrap(): Promise<State> {
		return this.getState();
	}
}

function formatCommits(commits: (GitCommit | GitStashCommit)[]): GitCommit[] {
	return commits.map((commit: GitCommit) => ({
		sha: commit.sha,
		author: commit.author,
		message: String(commit.message).length ? commit.message : commit.summary,
		parents: commit.parents,
		committer: commit.committer,
		type: getCommitType(commit)
	}));
}

// TODO: Move constant to a better home
const enum CommitType {
	CommitNode = 'commit-node',
	StashNode = 'stash-node',
}

function getCommitType(commit: GitCommit | GitStashCommit): CommitType {
	let type: CommitType = CommitType.CommitNode;
	if (GitCommitModel.isStash(commit)) {
		type = CommitType.StashNode;
	}

	// TODO: add other needed commit types for graph
	return type;
}

function filterStashCommits(stashCommits: GitStashCommit[] | undefined, log: GitLog | undefined): GitStashCommit[] {
	if (stashCommits === undefined || log === undefined) {
		return [];
	}

	// Filter out stash commits whose parents are not in the log
	return stashCommits.filter((stashCommit: GitStashCommit): boolean => {
		if (!stashCommit.parents?.length) {
			return true;
		}
		const parentCommit: GitCommitModel | undefined = log.commits.get(stashCommit.parents[0]);
		return parentCommit !== undefined;
	});
}

function formatRepositories(repositories: Repository[]): RepositoryData[] {
	if (repositories.length === 0) {
		return repositories;
	}

	return repositories.map(({ formattedName, id, name, path }) => ({
		formattedName: formattedName,
		id: id,
		name: name,
		path: path,
	}));
}

function formatLog(log: GitLog) {
	return {
		count: log.count,
		limit: log.limit,
		hasMore: log.hasMore,
		cursor: log.cursor,
	};
}
