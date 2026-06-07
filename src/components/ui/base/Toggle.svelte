<script lang="ts">
    interface Props {
        value: boolean;
        onChange: (value: boolean) => void;
        disabled?: boolean;
    }

    let {
        value = false, onChange = () => {},
        disabled = false
    }: Props = $props();
</script>

<div
        class="checkbox-container"
        role="checkbox"
        tabindex="0"
        aria-checked={value}
        class:is-enabled={value}
        onclick={() => {
            if (!disabled) {
                onChange(!value)
            }
            value = !value;
        }}
        onkeydown={(e) => {
            if(e.key != "Enter" && e.key != " ") return;
            onChange(!value)
            value = !value;
        }}
>
    <input type="checkbox" tabindex="0" {disabled}/>
</div>
