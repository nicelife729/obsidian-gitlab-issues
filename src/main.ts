import {Notice, Plugin, addIcon} from 'obsidian';
import {DEFAULT_SETTINGS, GitlabIssuesSettings, GitlabIssuesItemSettings, GitlabIssuesSettingTab} from './settings';
import log from "./logger";
import Filesystem from "./filesystem";
import GitlabLoader from "./gitlab-loader";
import gitlabIcon from './assets/gitlab-icon.svg';
import gitlab2Icon from './assets/gitlab2-icon.svg';
import {Gitlab} from "@gitbeaker/rest";

export default class GitlabIssuesPlugin extends Plugin {
	settings: GitlabIssuesSettings;
	startupTimeout: number|null = null;
	automaticRefresh: number|null = null;
	iconAdded = false;
	partIconAdded = false;

	async onload() {
		log('Starting plugin');



		await this.loadSettings(); 
		const tab = new GitlabIssuesSettingTab(this.app, this);
		this.addSettingTab(tab);

		if (this.settings.configFile) {
			tab.loadGitLabSetting(this.settings.configFile);
		}

		this.addIconToLeftRibbon();
		// this.addPartIconToLeftRibbon();
		this.addCommandToPalette();

		// this.refreshIssuesAtStartup();
		// this.scheduleAutomaticRefresh();


	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		console.log("最初", this.settings)
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private addIconToLeftRibbon() {
		if (this.settings.showIcon)
		{
			// Ensure we did not already add an icon 
			if (!this.iconAdded)
			{
				addIcon("gitlab", gitlabIcon);
				this.addRibbonIcon('gitlab', 'Gitlab Issues', (evt: MouseEvent) => {
					this.fetchFromGitlab(true);
				});
				this.iconAdded = true;
			}
		}
	}

	// private addPartIconToLeftRibbon() {
	// 	if (this.settings.showIcon)
	// 	{
	// 		// Ensure we did not already add an icon
	// 		if (!this.partIconAdded)
	// 		{
	// 			addIcon("gitlab2", gitlab2Icon);
	// 			this.addRibbonIcon('gitlab2', 'Gitlab Part Update Issues', (evt: MouseEvent) => {
	// 				this.fetchFromGitlab(false);
	// 			});
	// 			this.partIconAdded = true;
	// 		}
	// 	}
	// }

	private addCommandToPalette() {
		this.addCommand({
			id: 'import-gitlab-issues',
			name: 'Import Gitlab Issues',
			callback: () => {
				this.fetchFromGitlab(true);
			}
		});

		this.addCommand({
			id: 'part-import-gitlab-issues',
			name: 'Part Import Gitlab Issues',
			callback: () => {
				this.fetchFromGitlab(false);
			}
		});

		this.addCommand({
			id: 'update-gitlab-issues-notes',
			name: 'Update GitLab Issues notes',
			callback: () => {
				this.updateGitlabIssuesNotes();
			}
		});

	}

	private refreshIssuesAtStartup() {
		// Clear existing startup timeout
		if (this.startupTimeout) {
			window.clearTimeout(this.startupTimeout);
		}
		this.startupTimeout = this.registerInterval(window.setTimeout(() => {
			this.fetchFromGitlab(false);
		}, 30 * 1000)); // after 30 seconds
	}

	private scheduleAutomaticRefresh() {
		if (this.automaticRefresh) {
			window.clearInterval(this.automaticRefresh);
		}
		this.automaticRefresh = this.registerInterval(window.setInterval(() => {
			this.fetchFromGitlab(false);
		}, 60 * 60 * 1000)); // every 60 minutes
	}

	private async fetchFromGitlab (isAllUpdate: boolean) {
		console.log("获取数据时:", this.settings)
		if (this.settings.gitlabListJson != '' && this.settings.gitlabList.length > 0 && this.settings.gitlabList[0].gitlabToken) {		
			if (isAllUpdate) {
				new Notice('Updating issues from Gitlab');
			} else {
				new Notice('Part Updating issues from Gitlab');
			}
			
			this.settings.gitlabList.map((gitlabTarget: GitlabIssuesItemSettings) => {
				const loader = new GitlabLoader(this.app, gitlabTarget, this.settings);
				loader.createOutputFolder();
				loader.loadIssues(isAllUpdate);
			});
		}
	}

	private async updateGitlabIssuesNotes () {
		new Notice('Updating Some Issues Notes...')
		if (this.settings.gitlabListJson != '' && this.settings.gitlabList.length > 0 && this.settings.gitlabList[0].gitlabToken) {
			this.settings.gitlabList.map((gitlabTarget: GitlabIssuesItemSettings) => {
				console.log("开始更新issueNotes")

				const loader = new GitlabLoader(this.app, gitlabTarget, this.settings);
				loader.refreshIssueNotes();
			});
		}
	}
}
