<script lang="ts">
	import { Icon } from "rpg_shared/ui/base";

    interface Props {
        id: string,
        index: number,
        name: string,
        image?: string,
        onDeleteRequest: (id: string, index: number) => void
    }

    let { id, index, name, onDeleteRequest }:Props = $props();
</script>


<div class="plugin-settings-campaign-gallery-item" data-campaign-id={id}>
    <div class="plugin-settings-campaign-gallery-item-name">
        {name}
        <Icon class="item-icon" icon="trash-2" onclick={() => onDeleteRequest(id, index)} aria-label="Delete"/>
        {#if Image}
            <div class="plugin-settings-campaign-gallery-item-avatar"></div>
        {/if}
    </div>
</div>