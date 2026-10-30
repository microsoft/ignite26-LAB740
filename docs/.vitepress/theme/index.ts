import type { Theme } from "vitepress";
import { useData, useRouter, withBase } from "vitepress";
import DefaultTheme from "vitepress/theme";
import { defineComponent, h, onMounted, onUnmounted, watch } from "vue";
import "./custom.css";

export default {
  extends: DefaultTheme,
  Layout: defineComponent({
    setup() {
      const { isDark, frontmatter } = useData();
      const router = useRouter();
      const redirectLegacyLink = () => {
        const target = frontmatter.value.legacyLinks?.[window.location.hash];
        if (typeof target === "string") {
          const destination = new URL(withBase(target), window.location.origin);
          destination.search = window.location.search;
          void router.go(destination.href, { replace: true });
        }
      };
      onMounted(() => {
        const requested = new URLSearchParams(window.location.search).get("scoutTheme");
        if (requested === "dark" || requested === "light") {
          isDark.value = requested === "dark";
        }
        watch(isDark, (dark) => {
          document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
        }, { immediate: true });
        watch(() => frontmatter.value.legacyLinks, redirectLegacyLink, { immediate: true });
        window.addEventListener("hashchange", redirectLegacyLink);
      });
      onUnmounted(() => window.removeEventListener("hashchange", redirectLegacyLink));
      return () => h(DefaultTheme.Layout);
    },
  }),
} satisfies Theme;
