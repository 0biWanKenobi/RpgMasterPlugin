<script lang="ts">
	import { Tab, Tabs } from "rpg_shared/ui/custom";
	import DriveSettings from "./DriveSettingsTab.svelte";
	import OptionsTab from "./OptionsTab.svelte";
	import DbTestTab from "./DbTestTab.svelte";


</script>


<Tabs tabHeaders={["Options", "GoogleDrive", "Db Test"]}>
	{#snippet tabs()}
		<Tab index={0}>
			<OptionsTab />
		</Tab>
		<Tab index={1}>
			<DriveSettings />
		</Tab>
		<Tab index={2}>
			<DbTestTab />
		</Tab>
	{/snippet}

</Tabs>


