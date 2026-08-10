<script lang="ts">
	import CampaignManager from "./campaign/CampaignManager.svelte";
	import Profile from "./Profile.svelte";
	import { MASTER_PLUGIN } from "../capability";
	import { Tab, Tabs } from "rpg_shared/ui/custom";
	import DriveSettings from "./DriveSettings.svelte";
	import { getAppContext } from "../context.svelte";



	const {  plugin, settings } = getAppContext()


    const onCampaignCreated = async (cmpgnId: string, cmpgnName: string) => {
			settings.campaign.list.push({
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
			<CampaignManager {onCampaignCreated} />
		</Tab>
		<Tab index={1}>
			<DriveSettings />
		</Tab>
	{/snippet}

</Tabs>


