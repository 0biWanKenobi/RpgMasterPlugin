<script lang="ts">
	import { Icon } from "rpg_shared/ui/base";
	import { onMount } from "svelte";

    export type SyncStatus =
    | "unconfigured"
    | "idle"
    | "syncing"
    | "success"
    | "error";

    export type SyncStatusBarIconProps = {
        setLabel: (label: string) => void;
        status: SyncStatus;
    } & Record<string, unknown>;

    const { setLabel, status = "unconfigured" }:SyncStatusBarIconProps = $props();

    	const statusInfo = {
		unconfigured: {
			icon: "cloud-off",
			label: "RPG sync is not configured",
		},
		idle: {
			icon: "cloud",
			label: "RPG sync is ready",
		},
		syncing: {
			icon: "cloud-sync",
			label: "RPG sync in progress",
		},
		success: {
			icon: "cloud-check",
			label: "RPG sync completed",
		},
		error: {
			icon: "cloud-alert",
			label: "RPG sync failed",
		},
	} satisfies Record<SyncStatus, { icon: string; label: string }>;

    onMount(() => {
        setLabel(statusInfo[status].label);
    })

</script>

<div class="status-bar-item-segment">
    <span class="status-bar-item-icon"
    >
        <Icon 
            icon={statusInfo[status].icon}
            size={16}
            role="button"
            tabindex={0}
        />
    </span>
</div>