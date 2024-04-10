import { Issue } from "./issue";
import { Vault, MetadataCache, TFile, TAbstractFile, TFolder } from "obsidian";
import { GitlabIssuesSettings, GitlabIssuesItemSettings } from "./settings";
import log from "./logger";
import { compile } from 'handlebars';
import defaultTemplate from './default-template';
import { sanitizeFileName, delay } from './util';

export default class Filesystem {

	private vault: Vault;

	private metadataCache: MetadataCache;

	private settings: GitlabIssuesItemSettings;

	private globalSettings: GitlabIssuesSettings;

	constructor(vault: Vault, metadataCache: MetadataCache, settings: GitlabIssuesItemSettings, globalSettings: GitlabIssuesSettings) {
		this.vault = vault;
		this.metadataCache = metadataCache;
		this.settings = settings;
		this.globalSettings = globalSettings;
	}

	public createOutputDirectory() {
		this.vault.createFolder(this.settings.outputDir)
			.catch((error) => {
				if (error.message !== 'Folder already exists.') {
					log('Could not create output directory');
				}
			})
			;
	}

	// public purgeExistingIssues(issue: Object) {
	// 	const outputDir: TAbstractFile|null = this.vault.getAbstractFileByPath(this.settings.outputDir);
	// 	console.log("判断是否要更新")
	// 	if (outputDir instanceof TFolder) {
	// 		console.log("目录已匹配")
	// 		Vault.recurseChildren(outputDir, (existingFile: TAbstractFile) => {
	// 			if (existingFile instanceof TFile) {
	// 				console.log("目录已匹配")
	// 				if (existingFile.name == this.buildRawFileName(issue)) {
	// 					console.log("del",existingFile)
	// 					this.vault.delete(existingFile)
	// 					.catch(error => log(error.message));
	// 				}
	// 			}
	// 		});
	// 	}
	// }

	public processIssue(issue: Object) {
		// console.log(this.globalSettings.templateFile)
		this.vault.adapter.read(this.globalSettings.templateFile)
			.then((rawTemplate: string) => {
				// console.log("用自定义模板")
				this.writeRawFile(issue, compile(rawTemplate));
			})
			.catch((error) => {
				console.log("用标准模板", error);
				this.writeRawFile(issue, compile(defaultTemplate.toString()));
			})
			;
	}

	private writeRawFile(issue: Object, template: HandlebarsTemplateDelegate) {
		this.vault.create(this.buildRawFileName(issue), template(issue))
			.catch((error) => log(error.message))
			;
	}

	private buildRawFileName(obj: Object): string {
		const issue = obj as { title: string, id: number}
		return this.settings.outputDir + '/' + sanitizeFileName(issue.title + "_" + issue.id.toString()) + '.md';
	}


	private writeFile(issue: Issue, template: HandlebarsTemplateDelegate) {
		this.vault.create(this.buildFileName(issue), template(issue))
			.catch((error) => log(error.message))
			;
	}

	private buildFileName(issue: Issue): string {
		return this.settings.outputDir + '/' + issue.filename + '.md';
	}

	public async purgeExistingIssues(issue: Object) {
		let needDownloadNotes = false;
		const outputDir: TAbstractFile | null = this.vault.getAbstractFileByPath(this.settings.outputDir);
		if (outputDir instanceof TFolder) {
			const currentNewFileName = this.buildRawFileName(issue);

			let isExist = await this.vault.adapter.exists(currentNewFileName);
			let existFile = await this.vault.getAbstractFileByPath(currentNewFileName);

			if (isExist && existFile instanceof TFile) {
				const cache = this.metadataCache.getFileCache(existFile);
				const frontmatter = cache?.frontmatter;

				// const is = issue as { "updated_at": string , "notesIsBroken": boolean}
				const notesIsBroken = frontmatter?.['notesIsBroken']
				// 逐步在全量更新时弥补没有notes的issue，每次只更新maxNotesUpdateingNum个
				console.log(notesIsBroken, this.globalSettings.notesUpdateingSum, this.globalSettings.maxNotesUpdateingNum)
				if (notesIsBroken && this.globalSettings.notesUpdateingSum < this.globalSettings.maxNotesUpdateingNum) {
					console.log("存在旧文件");
					console.log("要更新的文件名", currentNewFileName);
					console.log("notes未完全下载成功，立即删除，待下一次重新下载");
					await this.vault.delete(existFile).catch((error) => console.error(error));
					needDownloadNotes = true
				} else {
					if (frontmatter?.['updatedAt']) {
						const is = issue as { "updated_at": string }
						console.log("旧文件更新时间", frontmatter['updatedAt']);
						console.log("新文件更新时间", is.updated_at);
	
						const existFileUpdateTime = new Date(frontmatter['updatedAt']);
						const newFileUpdateTime = new Date(is.updated_at);
	
	
						if (existFileUpdateTime.getTime() < newFileUpdateTime.getTime()) {
							console.log("删除了文件", existFile);
							await this.vault.delete(existFile).catch((error) => console.error(error));
							needDownloadNotes = true
						}
					}
				}
			} else {
				needDownloadNotes = true
			}
		}
		return needDownloadNotes
	}

	 public refreshssueNotesByDir(callback: (projectId: number, iid: number) => Promise<void>) {
		const outputDir: TAbstractFile|null = this.vault.getAbstractFileByPath(this.settings.outputDir);
	
		if (outputDir instanceof TFolder) {
			Vault.recurseChildren(outputDir, (existingFile: TAbstractFile) => {
				if (existingFile instanceof TFile) {
					const cache = this.metadataCache.getFileCache(existingFile);
					const frontmatter = cache?.frontmatter;
					if (
						frontmatter?.['iid'] != undefined &&
						frontmatter?.['projectId'] !== undefined && 
						frontmatter?.['notesIsBroken'] == true &&
						this.globalSettings.notesUpdateingSum < this.globalSettings.maxNotesUpdateingNum
					) {
						console.log("处理文件")
						const projectId = frontmatter['projectId'];
						const iid = frontmatter['iid'];
						this.globalSettings.notesUpdateingSum += 1;
						delay(1000);
						 callback(projectId, iid).then(() => {
							this.updateNotesUpdatingSum();
						 }).catch((error) => {
							console.error(error)
							this.updateNotesUpdatingSum();
						 })
					}
				}
			});
		}
	}

	// notes更新完毕减少正在更新的notes计数
	private updateNotesUpdatingSum() {
		if (this.globalSettings.notesUpdateingSum >= 1) {
			this.globalSettings.notesUpdateingSum -= 1;
		} else {
			this.globalSettings.notesUpdateingSum = 0;
		}
	}	
}
