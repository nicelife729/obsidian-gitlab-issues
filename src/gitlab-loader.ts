import GitlabApi from "./gitlab-api";
import {GitlabIssue, Issue} from "./issue";
import {App} from "obsidian";
import {GitlabIssuesSettings} from "./settings";
import Filesystem from "./filesystem";
import {Gitlab} from "@gitbeaker/rest";
import { accessSync } from "fs";
import { adjustImageMarkdown, adjustMarkdownLink } from './util';



export default class GitlabLoader {

	private fs: Filesystem;
	private settings: GitlabIssuesSettings;
	private api: Gitlab;

	constructor(app: App, settings: GitlabIssuesSettings, api: Gitlab) {
		this.fs = new Filesystem(app.vault, settings);
		this.settings = settings;
		this.api = api;
	}

	// getUrl() {
	// 	switch (this.settings.gitlabIssuesLevel) {
	// 		case "project":
	// 			return `${this.settings.gitlabApiUrl()}/projects/${this.settings.gitlabAppId}/issues?${this.settings.filter}`;
	// 		case "group":
	// 			return `${this.settings.gitlabApiUrl()}/groups/${this.settings.gitlabAppId}/issues?${this.settings.filter}`;
	// 		case "personal":
	// 		default:
	// 			return `${this.settings.gitlabApiUrl()}/issues?${this.settings.filter}`;
	// 	}
	// }

	// loadIssues() {
	// 	GitlabApi.load<Array<Issue>>(encodeURI(this.getUrl()), this.settings.gitlabToken)
	// 		.then((issues: Array<Issue>) => {
	// 			const gitlabIssues = issues.map((rawIssue: Issue) => new GitlabIssue(rawIssue));

	// 			if(this.settings.purgeIssues) {
	// 				this.fs.purgeExistingIssues();
	// 			}

	// 			this.fs.processIssues(gitlabIssues);
	// 		})
	// 		.catch(error => {
	// 			console.error(error.message);
	// 		});
	// }

	translateIssues(issues: Array<Object>) {
		issues.map(async (rawIssue: Object) => {

			// xrj TODO 需要一个一个检查是否需要删除
			if(this.settings.purgeIssues) {
				this.fs.purgeExistingIssues();
			}

			const issue = rawIssue as {iid: number, project_id: number, description: string, web_url: string}
			const issueNotes = await this.api.IssueNotes.all(issue.project_id, issue.iid, {
				sort: 'asc',
				orderBy: 'created_at',
				perPage: 100
			});

			// 将markdown中的路径替换为完整的url
			const prefix = issue.web_url.split("/-/issues/")[0];
			console.log(issue.project_id, issue.iid, prefix);
			(rawIssue as any).description = adjustImageMarkdown(issue.description, prefix);
			(rawIssue as any).description = adjustMarkdownLink(issue.description, prefix);
		
			issueNotes.map((issueNote: Object) => {
				(issueNote as any).body = adjustImageMarkdown((issueNote as any).body, prefix);
				(issueNote as any).body = adjustMarkdownLink((issueNote as any).body, prefix);
			});

			(rawIssue as any).notes = issueNotes;
			
			this.fs.processIssue(rawIssue);
		});
	}

	loadIssues() {
		switch (this.settings.gitlabIssuesLevel) {
			case "project":
				return this.loadProjectIssues().then(data => {
					this.translateIssues(data)
				}).catch(error => {
					console.error(error.message);
				});
			case "group":
				return this.loadGroupIssues().then(data => {
					console.log(data)
					this.translateIssues(data)
				}).catch(error => {
					console.error(error.message);
				});
			case "personal":
			default:
				return this.loadPersonalIssues().then(data => {
					console.log(data)
					this.translateIssues(data)
				}).catch(error => {
					console.error(error.message);
				});
		}

	}

	async loadProjectIssues() {
		return this.api.Issues.all({projectId: this.settings.gitlabAppId, maxPages:1, perPage: 20})
	}

	async loadGroupIssues() {
		return this.api.Issues.all({groupId: this.settings.gitlabAppId, maxPages:1, perPage: 100})
	}

	async loadPersonalIssues() {
		return this.api.Issues.all({ maxPages:1, perPage: 100})
	}
}
