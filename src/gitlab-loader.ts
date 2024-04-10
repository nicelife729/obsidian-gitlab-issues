import {App} from "obsidian";
import { GitlabIssuesItemSettings, GitlabIssuesSettings } from "./settings";
import Filesystem from "./filesystem"
import { adjustImageMarkdown, adjustLabels, adjustMarkdownLink } from './util';



export default class GitlabLoader {
	private fs: Filesystem;
	private settings: GitlabIssuesItemSettings;
	private globalSettings: GitlabIssuesSettings;


	constructor(app: App, settings: GitlabIssuesItemSettings,  globalSettings: GitlabIssuesSettings) {
		this.fs = new Filesystem(app.vault, app.metadataCache, settings, globalSettings);
		this.settings = settings;
	}
	
	translateIssues(issues: Array<Object>) {
		issues.map(async (rawIssue: Object) => {
			const issue = rawIssue as {iid: number, project_id: number, description: string, web_url: string, labels: Array<string>}
			let issueNotes = [];
			try {
				let needDownloadNotes;
				// 检查该文件是否需要删除
				if(this.settings.purgeIssues) {
					needDownloadNotes = await this.fs.purgeExistingIssues(rawIssue);
				}

				if (needDownloadNotes) {
					issueNotes = await this.settings.api.IssueNotes.all(issue.project_id, issue.iid, {
						sort: 'asc',
						orderBy: 'created_at',
						perPage: 100
					});
					(rawIssue as any).notesIsBroken = false
				}
			} catch (error) {
				console.error("issueNote获取失败", error);
				(rawIssue as any).notesIsBroken = true;
				this.globalSettings.notesUpdateingSum += 1;
			}
			
			// 将markdown中的路径替换为完整的url
			const prefix = issue.web_url.split("/-/issues/")[0];
			// console.log(issue.project_id, issue.iid, prefix);
			(rawIssue as any).description = adjustImageMarkdown(issue.description, prefix);
			(rawIssue as any).description = adjustMarkdownLink(issue.description, prefix);

			issue.labels.map((label: string, index) => {
				issue.labels[index] = adjustLabels(label)
			})
		
			issueNotes.map((issueNote: Object) => {
				(issueNote as any).body = adjustImageMarkdown((issueNote as any).body, prefix);
				(issueNote as any).body = adjustMarkdownLink((issueNote as any).body, prefix);
			});

			(rawIssue as any).notes = issueNotes;
			
			this.fs.processIssue(rawIssue);
		});
	}

	createOutputFolder() {
		this.fs.createOutputDirectory();
	}

	loadIssues(isAllUpdate: boolean) {
		switch (this.settings.gitlabIssuesLevel) {
			case "project":
				return this.loadProjectIssues(isAllUpdate).then(data => {
					this.translateIssues(data)
				}).catch(error => {
					console.error(error);
				});
			case "group":
				return this.loadGroupIssues(isAllUpdate).then(data => {
					this.translateIssues(data)
				}).catch(error => {
					console.error(error);
				});
			case "personal":
			default:
				return this.loadPersonalIssues(isAllUpdate).then(data => {
					this.translateIssues(data)
				}).catch(error => {
					console.error(error.message);
				});
		}

	}

	addPartParams(baseParams: Object, filterParams: Object) {
		// 获取当前日期
		const currentDate = new Date();

		// 计算一周前的日期：一天的毫秒数是 24 * 60 * 60 * 1000 = 86400000
		const oneWeekAgo = new Date(currentDate.getTime() - 7 * 86400000);

		// 将日期转换为 ISO 字符串
		const oneWeekAgoISOString = oneWeekAgo.toISOString();
		
		return {...baseParams, ...filterParams, ...{updatedAfter: oneWeekAgoISOString}}
	}

	async loadProjectIssues(isAllUpdate: boolean) {
		let params = {projectId: this.settings.gitlabAppId, perPage: 100};
		// console.log(this.settings.filter)
		let filterParams = this.settings.filter
		let p = {};

		if (isAllUpdate) {
			p = {...params, ...filterParams}
		} else {
			p = this.addPartParams(params, filterParams)
		}

		// console.log("查询参数：", p)
		return this.settings.api.Issues.all(p)
	}

	async loadGroupIssues(isAllUpdate: boolean) {
		let params = {groupId: this.settings.gitlabAppId, perPage: 100};
		let filterParams = this.settings.filter

		let p = {};

		if (isAllUpdate) {
			p = {...params, ...filterParams}
		} else {
			p = this.addPartParams(params, filterParams)
		}

		// console.log("查询参数：", p)
		return this.settings.api.Issues.all(p)
	}

	async loadPersonalIssues(isAllUpdate: boolean) {
		let params = {perPage: 100};
		let filterParams = this.settings.filter

		let p = {};

		if (isAllUpdate) {
			p = {...params, ...filterParams}
		} else {
			p = this.addPartParams(params, filterParams)
		}

		// console.log("查询参数：", p)
		return this.settings.api.Issues.all(p)
	}

	refreshIssueNotes() {
		this.fs.refreshssueNotesByDir(async (projectId: number, iid: number) => {
			try {
				let p = {projectId: projectId, iids: [iid], perPage: 100};
				let data = await this.settings.api.Issues.all(p)
				this.translateIssues(data)
			} catch (error) {
				console.error(error)
			} 
		})
	}
}
