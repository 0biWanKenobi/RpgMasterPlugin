<script lang="ts">
	import { Tab, Tabs } from "rpg_shared/ui/custom";
	import DriveSettings from "./DriveSettingsTab.svelte";
	import OptionsTab from "./OptionsTab.svelte";
	import DbTestTab from "./DbTestTab.svelte";
	import SyncEngineTestTab from "./SyncEngineTestTab.svelte";

</script>


<Tabs tabHeaders={["Options", "GoogleDrive", "Db Test", "Sync Test"]}>
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
		<Tab index={3}>
			<SyncEngineTestTab />
		</Tab>
	{/snippet}

</Tabs>


