<script lang="ts">
	import { Tab, Tabs } from "rpg_shared/ui/custom";
	import DriveSettings from "./DriveSettingsTab.svelte";
	import OptionsTab from "./OptionsTab.svelte";


</script>


<Tabs tabHeaders={["Options", "GoogleDrive"]}>
	{#snippet tabs()}
		<Tab index={0}>
			<OptionsTab />
		</Tab>
		<Tab index={1}>
			<DriveSettings />
		</Tab>
	{/snippet}

</Tabs>


