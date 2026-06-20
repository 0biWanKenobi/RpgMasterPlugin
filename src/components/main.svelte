<script lang="ts">
	import { App } from "obsidian";
	import Campaign from "./Campaign.svelte";
	import Profile from "./Profile.svelte";
	import { type PluginSettings } from "../settings";
	import RPGDungeonMasterPlugin from "../rpgMasterMain";
	import { MASTER_PLUGIN } from "../capability";
	import { Tab, Tabs } from "rpg_shared/ui/custom";

    type Props = {
            app: App,
            plugin: RPGDungeonMasterPlugin,
            pgSettings: PluginSettings,
        }

    let { plugin, pgSettings }: Props = $props();


    const onCampaignCreated = async (cmpgnId: string, cmpgnName: string) => {
			pgSettings.campaigns.push({
				id: cmpgnId,
				name: cmpgnName,
				masterId: '',
				playerCount: 0,
				startDate: new Date(),
				lastUpdated: new Date(),
			});
			await plugin.saveSettings(MASTER_PLUGIN);
		}

</script>


<Tabs tabHeaders={["Options", "GoogleDrive"]}>
	{#snippet tabs()}
		<Tab index={0}>
			<Profile/>			
			<Campaign {onCampaignCreated} />
		</Tab>
		<Tab index={1}>
			Hello
		</Tab>
	{/snippet}

</Tabs>


