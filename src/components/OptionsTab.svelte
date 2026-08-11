<script lang="ts">
	import { MASTER_PLUGIN } from "../utils/capability";
	import { getAppContext } from "../context.svelte";
	import CampaignManager from "./campaign/CampaignManager.svelte";
	import Profile from "./Profile.svelte";


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


<Profile/>
<CampaignManager {onCampaignCreated} />