import {App, normalizePath, PluginSettingTab, Setting} from "obsidian";
import GitlabIssuesPlugin from "./main";
import {Gitlab} from "@gitbeaker/rest";


type GitlabIssuesLevel = 'personal' | 'project' | 'group'

export interface GitlabIssuesSettings {
	showIcon: boolean;
	gitlabList: Array<GitlabIssuesItemSettings>;
	gitlabListJson: string;
	configFile: string;
	templateFile: string;
	notesUpdateingSum: number;
	maxNotesUpdateingNum: number;
}

export interface GitlabIssuesItemSettings {
	gitlabUrl: string;
	gitlabToken: string;
	gitlabIssuesLevel: GitlabIssuesLevel;
	gitlabAppId: string;
	outputDir: string;
	filter: Object;
	purgeIssues: boolean;
	api: Gitlab;
}
export const DEFAULT_ITEM_SETTINGS: GitlabIssuesItemSettings = {
	gitlabUrl: 'https://gitlab.com',
	gitlabToken: '',
	gitlabIssuesLevel: 'personal',
	gitlabAppId: '',
	outputDir: '/Gitlab Issues/',
	filter: {},
	purgeIssues: true,
	api: new Gitlab({
		host: 'https://gitlab.com',
		token: 'faketoken'
	})
}

export const DEFAULT_SETTINGS: GitlabIssuesSettings = {
	gitlabList: [DEFAULT_ITEM_SETTINGS],
	showIcon: true,
	gitlabListJson: '{ "gitlabList": [ { "gitlabUrl": "https://gitlab.com", "gitlabToken": "", "outputDir": "", "filter": {}, "purgeIssues": true } ] }',
	configFile: "",
	templateFile: "",
	notesUpdateingSum: 0,
	maxNotesUpdateingNum: 50,
};

export class GitlabIssuesSettingTab extends PluginSettingTab {
	plugin: GitlabIssuesPlugin;

	constructor(app: App, plugin: GitlabIssuesPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();
		containerEl.createEl('h2', {text: 'GitLab Issues Configuration'});

		/**
		new Setting(containerEl)
			.setName('Gitlab instance URL')
			.setDesc('Use your own Gitlab instance instead of the public hosted Gitlab.')
			.addText(text => text
				.setPlaceholder('https://gitlab.com')
				.setValue(this.plugin.settings.gitlabUrl)
				.onChange(async (value) => {
					this.plugin.settings.gitlabUrl = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Personal Access Token')
			.setDesc('Create a personal access token in your Gitlab account and enter it here.')
			.addText(text => text
				.setPlaceholder('Token')
				.setValue(this.plugin.settings.gitlabToken)
				.onChange(async (value) => {
					this.plugin.settings.gitlabToken = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Template File')
			.setDesc('Path to an Obsidian note to use as the template.')
			.addText(text => text
				.setPlaceholder('your-template-file.md')
				.setValue(this.plugin.settings.templateFile)
				.onChange(async (value) => {
					this.plugin.settings.templateFile = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Output Folder')
			.setDesc('Path to an Obsidian folder to write output files to.')
			.addText(text => text
				.setPlaceholder('/Gitlab Issues/')
				.setValue(normalizePath(this.plugin.settings.outputDir))
				.onChange(async (value) => {
					value = normalizePath(value);
					this.plugin.settings.outputDir = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Issues Filter')
			.setDesc('The query string used to filter the issues.')
			.addText(text => text
				.setPlaceholder('due_date=month')
				.setValue(this.plugin.settings.filter)
				.onChange(async (value) => {
					this.plugin.settings.filter = value;
					await this.plugin.saveSettings();
				}));


		new Setting(containerEl)
			.setName('GitLab Level')
			.addDropdown(value => value
				.addOptions({personal: "Personal", project: "Project", group: "Group"})
				.setValue(this.plugin.settings.gitlabIssuesLevel)
				.onChange(async (value: GitlabIssuesLevel) => {
					this.plugin.settings.gitlabIssuesLevel = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Set Gitlab Project/Group Id')
			.setDesc('If Group or Project is set, add the corresponding ID.')
			.addText(value => value
				.setValue(this.plugin.settings.gitlabAppId)
				.onChange(async (value: string) => {
					this.plugin.settings.gitlabAppId = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Purge issues that are no longer in Gitlab?')
			.addToggle(value => value
				.setValue(this.plugin.settings.purgeIssues)
				.onChange(async (value) => {
					this.plugin.settings.purgeIssues = value;
					await this.plugin.saveSettings();
				}));

		*/

		new Setting(containerEl)
			.setName('Template File')
				.setDesc('Path to an Obsidian note to use as the template.')
				.addText(text => text
					.setPlaceholder('your-template-file.md')
					.setValue(this.plugin.settings.templateFile)
					.onChange(async (value) => {
						this.plugin.settings.templateFile = value;
						await this.plugin.saveSettings();
					}));

		new Setting(containerEl)
			.setName('Gitlab Target List Template File')
				.setDesc('Json to gitlab target List as the template.')
				.addText(text => text
					.setPlaceholder('your-config-template-file.md')
					.setValue(this.plugin.settings.configFile)
					.onChange(async (configfileName) => {
						this.plugin.settings.configFile = configfileName;
						this.loadGitLabSetting(configfileName);
						
						
						await this.plugin.saveSettings();
					}));

		new Setting(containerEl)
			.setName('Show refresh Gitlab issues icon in left ribbon?')
			.addToggle(value => value
				.setValue(this.plugin.settings.showIcon)
				.onChange(async (value) => {
					this.plugin.settings.showIcon = value;
					await this.plugin.saveSettings();
				}));

		containerEl.createEl('h3', {text: 'More Information'});
		containerEl.createEl('a', {
			text: 'View the Gitlab documentation',
			href: 'https://docs.gitlab.com/ee/api/issues.html#list-issues'
		});
	}

	loadGitLabSetting(configfileName: string) {
		this.app.vault.adapter.read(configfileName)
			.then((rawTemplate: string) => {
				this.plugin.settings.gitlabList = JSON.parse(rawTemplate);
				console.log("当前生效的配置文件", this.plugin.settings)
				if (this.plugin.settings.gitlabList.length > 0) {
					//遍历每个gitlab配置项
					this.plugin.settings.gitlabList.map((gitlabIssuesItemSettings: GitlabIssuesItemSettings) => {
						gitlabIssuesItemSettings.api = new Gitlab({
							host: gitlabIssuesItemSettings.gitlabUrl,
							token: gitlabIssuesItemSettings.gitlabToken,
							rateLimits: {
								'**': 3000,
								'projects/*/issues/*/notes': {
								  method: 'get',
								  limit: 300,
								},
								'groups/*/issues/': {
									method: 'get',
									limit: 60,
								},
								'projects/*/issues/': {
									method: 'get',
									limit: 60,
								},
							},
						});
						
					})
				}
				
			})
			.catch((error) => {
				console.error(error.message)
			})
	}
}
