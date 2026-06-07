<script lang="ts">
  import { Icon } from "./";

  interface State {
    icon?: string;
    text?: string;
    tooltip?: string;
  }

  interface Props {
    states: State[];
    value: number;
    size?: number | null;
    onClick?: () => void;
    onContextMenu?: (e: Event) => void;
    class?: string;
  }

    let {
        states = [],
        value = $bindable(0),
        size = null,
        onClick = () => {},
        onContextMenu = () => {},
        class: className = "",
    }: Props = $props();


    const state = $derived(() => states[value]!)
</script>

<div
  class={className + " svelcomlib-icon-text"}
  role="button"
  tabindex="0"
  aria-label={state().tooltip}
  onclick={() => {
    value = (value + 1) % states.length;
    onClick();
  }}
  onkeydown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      value = (value + 1) % states.length;
      onClick();
    }
  }}
  oncontextmenu={onContextMenu}
>
  {#if state().icon}
    <Icon icon={state().icon} {size} />
  {/if}

  {#if state().text}
    {state().text}
  {/if}
</div>
