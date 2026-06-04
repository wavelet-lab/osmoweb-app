<script lang="ts">
import { defineComponent } from 'vue';
import OsmoMain from './components/OsmoMain.vue';

export default defineComponent({
    name: 'App',
    components: {
        OsmoMain
    }
});
</script>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { login, logout } from '@websdr/frontend-core';

const authReady = ref(false);
const authError = ref<string | null>(null);

function handleBeforeUnload() {
    /*
     * Do not logout on tab close: all tabs share the same session cookie.
     */
    // logout();
}

onMounted(() => {
    login()
        .then(() => {
            authReady.value = true;
            authError.value = null;
            console.log('Auto login successful');
        }).catch(err => {
            authReady.value = false;
            authError.value = err instanceof Error ? err.message : String(err);
            console.warn('Auto login failed', err);
        });

    window.addEventListener('beforeunload', handleBeforeUnload);

});

onBeforeUnmount(() => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
});

</script>

<template>
    <div id="app">
        <OsmoMain v-if="authReady" />
        <div v-else class="app-auth-status">
            {{ authError ? `Login failed: ${authError}` : 'Logging in...' }}
        </div>
    </div>
</template>

<style lang="scss" src="@/styles/app.scss" />
