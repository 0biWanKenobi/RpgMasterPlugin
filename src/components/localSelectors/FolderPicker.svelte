<script lang="ts">
  import { onMount } from "svelte";
  import type { App, TFolder } from "obsidian";
  import { FolderSuggest } from "./folderSuggest";
	import { Icon } from "rpg_shared/ui/base";
  

    type Props = {
        app: App,
        value?: string,
        onSelected?: (folder?: TFolder) => (void | Promise<void>)
    }

  let { app, value, onSelected }: Props = $props();

  let inputEl: HTMLInputElement;

  onMount(() => {
    const suggest = new FolderSuggest(app, inputEl);

    if(value)
        suggest.setValue(value);

    suggest.onSelect((folder?: TFolder) => {
      suggest.setValue(folder?.path ?? "");
      suggest.close();
      onSelected?.(folder);
    });
  });
</script>

<div class="input-wrapper">
  <input
      type="text"
      bind:this={inputEl}
      bind:value
      placeholder="Select a folder..."
  />
  <Icon icon="circle-x" class="clear-icon" onclick={() => {
    inputEl.value = "";
    onSelected?.();
  }}/>
</div>

<style>
  .input-wrapper {
    position: relative;
    display: flex;
    align-items: center;

    :global(.clear-icon) {
      position: absolute;
      right: 5px;
      cursor: pointer;
    }
  }

  input {
    width: 100%;
    padding-right: 30px; /* Space for the clear icon */
  }

  
</style>