<script lang="ts">
	import { Button } from "rpg_shared/ui/base";
    import { longpress } from "../../utils/longpress"
	import { Menu } from "obsidian";
	import { onMount } from "svelte";
	
    interface Props {
        id: string,
        index: number,
        name: string,
        image?: string,
        onDeleteRequest: (id: string, index: number) => void
    }

    let { id, index, name, onDeleteRequest }:Props = $props();

    let menu: Menu | undefined = undefined;

    onMount(() => {
        return (() => menu?.unload())
    })

    function showContextMenu(e: MouseEvent){
        menu = (new Menu())
                   .addItem( i => {
                       i
                        .setTitle("Delete Campaign")
                        .setIcon("trash-2")
                        .onClick(() => onDeleteRequest(id, index))
                   })
                   .showAtMouseEvent(e)

    }
</script>


<div use:longpress onlongpress={e => showContextMenu(e.detail)} class="plugin-settings-campaign-gallery-item" data-campaign-id={id}>
    <div class="plugin-settings-campaign-gallery-item-name">
        {name}
        <Button class="item-icon" icon="trash-2" onClick={() => onDeleteRequest(id, index)} tooltip="Delete"/>
        {#if Image}
            <div class="plugin-settings-campaign-gallery-item-avatar"></div>
        {/if}
    </div>
</div>