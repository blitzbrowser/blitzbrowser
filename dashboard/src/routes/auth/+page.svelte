<script lang="ts">
    import * as Card from "$lib/components/ui/card";
    import * as Field from "$lib/components/ui/field";
    import * as Alert from "$lib/components/ui/alert";
    import logo from "$lib/assets/logo.svg";
    import favicon from "$lib/assets/favicon.ico";
    import AlertCircleIcon from "@lucide/svelte/icons/alert-circle";
    import "../layout.css";
    import Button from "$lib/components/ui/button/button.svelte";
    import Input from "$lib/components/ui/input/input.svelte";
    import { goto } from "$app/navigation";
    import { ModeWatcher } from "mode-watcher";

    let error_message: string = $state("");
    let auth_key: string = $state("");

    let is_authenticating = $state(false);

    function onEnter(event: KeyboardEvent) {
        if (event.code === "Enter") {
            authenticate();
        }
    }

    async function authenticate() {
        try {
            error_message = "";
            is_authenticating = true;

            const response = await fetch(`/api/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ auth_key }),
            });

            const { authenticated }: { authenticated: boolean } =
                await response.json();

            if (authenticated) {
                goto("/");
            } else {
                error_message = "Wrong Auth Key Provided.";
            }
        } catch (e) {
            error_message = "Error while connecting to the API.";
        } finally {
            is_authenticating = false;
        }
    }
</script>

<ModeWatcher />

<svelte:head>
    <link rel="icon" href={favicon} />
    <title>Auth | BlitzBrowser</title>
</svelte:head>

<div
    class="bg-background w-screen h-dvh flex flex-col justify-center items-center"
>
    <Card.Root class="max-w-96 w-full">
        <Card.Header>
            <div class="flex flex-row items-center justify-center">
                <img src={logo} alt="BlitzBrowser logo" class="h-12" />
                <span class="font-extrabold text-4xl">BlitzBrowser</span>
            </div>
        </Card.Header>
        <Card.Content>
            <Field.Field>
                <Field.Label for="name">Auth Key</Field.Label>
                {#if error_message !== ""}
                    <Alert.Root variant="destructive">
                        <AlertCircleIcon />
                        <Alert.Title>{error_message}</Alert.Title>
                    </Alert.Root>
                {/if}
                <Input
                    id="name"
                    type="password"
                    bind:value={auth_key}
                    onkeydown={onEnter}
                    disabled={is_authenticating}
                />
            </Field.Field>
        </Card.Content>
        <Card.Footer>
            <Button
                disabled={is_authenticating || auth_key === ""}
                class="w-full cursor-pointer"
                onclick={authenticate}
            >
                Login
            </Button>
        </Card.Footer>
    </Card.Root>
    <span
        class="max-w-96 w-full text-center text-muted-foreground mt-3 text-xs"
    >
        Need help? Find all the documentation at <a
            href="https://docs.blitzbrowser.com/"
            target="_blank"
            class="underline"
        >
            https://docs.blitzbrowser.com/
        </a>
    </span>
</div>
