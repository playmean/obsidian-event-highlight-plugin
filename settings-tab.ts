import { App, PluginSettingTab, Setting } from 'obsidian';

import Plugin from './main';

export class SettingsTab extends PluginSettingTab {
    plugin: Plugin;

    constructor(app: App, plugin: Plugin) {
        super(app, plugin);

        this.plugin = plugin;
    }

    display(): void {
        let { containerEl } = this;

        containerEl.empty();

        new Setting(containerEl).setName('Display date format').addText((text) =>
            text
                .setPlaceholder('MMMM dd, yyyy')
                .setValue(this.plugin.settings.dateFormat)
                .onChange(async (value) => {
                    this.plugin.settings.dateFormat = value;

                    await this.plugin.saveSettings();
                }),
        );

        new Setting(containerEl).setName('Display date/time format').addText((text) =>
            text
                .setPlaceholder('MMMM dd, yyyy HH:mm')
                .setValue(this.plugin.settings.dateTimeFormat)
                .onChange(async (value) => {
                    this.plugin.settings.dateTimeFormat = value;

                    await this.plugin.saveSettings();
                }),
        );
    }
}
