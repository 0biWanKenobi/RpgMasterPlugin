import { UserPasswordModal } from "rpg_shared/ui/custom";
import { Component, ComponentProps, mount } from "svelte";
import { createState } from "../helpers.svelte";

type PwdModalState = {value: boolean}

export function addPwdModal(
    domEl: HTMLElement,
    pwModalOpen: PwdModalState,
    actions: {
        onReturnPwd?: (v: string | undefined) => void,
        onCancel?: () => void
    }
) {
    const modalWrapper: Component<ComponentProps<typeof UserPasswordModal>> = (internals, props) => {
        pwModalOpen = createState(false);
        return UserPasswordModal(internals, props)
    }

    const pwdModal = mount(
        modalWrapper,
        {
            target: domEl,
            props: {
                get open(){ return pwModalOpen.value},
                set open(v) { pwModalOpen.value = v},
                title: "Provide password",
                onReturn(v) {
                    pwModalOpen.value = false;
                    actions.onReturnPwd?.(v)
                },
                onCancel() {
                    pwModalOpen.value = false
                }
            }
        }
    )

    return {
        pwdModal,
        pwModalOpen
    }
}