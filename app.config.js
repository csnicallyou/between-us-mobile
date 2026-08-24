const standaloneVariants = {
  anton: {
    name: "Между нами — Антон",
    bundleIdentifier: "com.betweenus.mobile.anton",
    scheme: "betweenus-anton",
  },
  liza: {
    name: "Между нами — Лиза",
    bundleIdentifier: "com.betweenus.mobile.liza",
    scheme: "betweenus-liza",
  },
};

module.exports = ({ config }) => {
  const variantName = process.env.BUILD_VARIANT;
  const variant = standaloneVariants[variantName];

  if (!variant) return config;

  const plugins = (config.plugins ?? []).filter((plugin) => {
    const name = Array.isArray(plugin) ? plugin[0] : plugin;
    return name !== "expo-widgets" && name !== "expo-dev-client";
  });

  return {
    ...config,
    name: variant.name,
    scheme: variant.scheme,
    plugins: [...plugins, ["expo-dev-client", { addGeneratedScheme: false }]],
    ios: {
      ...config.ios,
      bundleIdentifier: variant.bundleIdentifier,
    },
    android: {
      ...config.android,
      package: variant.bundleIdentifier,
    },
    extra: {
      ...config.extra,
      buildVariant: variantName,
    },
  };
};
