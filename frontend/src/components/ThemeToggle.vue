<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
    name: 'ThemeToggle',
});
</script>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

// Props interface
export interface ThemeToggleProps {
    showLabel?: boolean;
    size?: 'small' | 'medium' | 'large';
}

const props = withDefaults(defineProps<ThemeToggleProps>(), {
    showLabel: true,
    size: 'medium'
});

// Theme state
const isDarkTheme = ref<boolean>(false);

// Theme management functions
const toggleTheme = () => {
    isDarkTheme.value = !isDarkTheme.value;
    updateTheme();
};

const updateTheme = () => {
    const root = document.documentElement;
    const theme = isDarkTheme.value ? 'dark' : 'light';
    root.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
};

// System theme change handler
let mediaQuery: MediaQueryList;
let handleSystemThemeChange: (e: MediaQueryListEvent) => void;
let handleKeyboard: (e: KeyboardEvent) => void;

// Load saved theme on component mount
onMounted(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        isDarkTheme.value = true;
    } else if (savedTheme === 'light') {
        isDarkTheme.value = false;
    } else {
        // Default to system preference
        isDarkTheme.value = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    updateTheme();

    // Listen for system theme changes
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    handleSystemThemeChange = (e: MediaQueryListEvent) => {
        if (!localStorage.getItem('theme')) {
            isDarkTheme.value = e.matches;
            updateTheme();
        }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);

    // Add keyboard shortcut (Ctrl/Cmd + Shift + S)
    handleKeyboard = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
            e.preventDefault();
            toggleTheme();
        }
    };

    document.addEventListener('keydown', handleKeyboard);
});

// Cleanup on component unmount
onUnmounted(() => {
    if (mediaQuery && handleSystemThemeChange) {
        mediaQuery.removeEventListener('change', handleSystemThemeChange);
    }
    if (handleKeyboard) {
        document.removeEventListener('keydown', handleKeyboard);
    }
});
</script>

<template>
    <div class="theme-toggle">
        <button @click="toggleTheme" class="theme-button" :class="`theme-button--${size}`"
            :title="`${isDarkTheme ? 'Switch to light theme' : 'Switch to dark theme'} (Ctrl+Shift+S)`">
            <span class="theme-icon">{{ isDarkTheme ? '☀️' : '🌙' }}</span>
            <span v-if="showLabel" class="theme-label">{{ isDarkTheme ? 'Light' : 'Dark' }}</span>
        </button>
    </div>
</template>

<style scoped lang="scss" src="@/styles/theme-toggle.scss" />
