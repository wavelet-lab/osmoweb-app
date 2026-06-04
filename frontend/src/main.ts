import { createApp } from 'vue';
import App from './App.vue';

const autoRefresh = false; // Set to true to enable auto-refresh on service worker updates

const app = createApp(App);
app.mount('#app');

if (autoRefresh && 'serviceWorker' in navigator) {
    let refreshing = false;

    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
    });
}