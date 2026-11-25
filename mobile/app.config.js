// app.json plus the holiday and event app icons in assets/app-icons (made from the SendMyBeat
// icon). expo-alternate-app-icons copies them into the native projects at prebuild, so changing
// this list needs a new build, not an over-the-air update.
const icons = require('./assets/app-icons/icons.json');

module.exports = ({ config }) => ({
  ...config,
  plugins: [
    ...(config.plugins ?? []),
    [
      'expo-alternate-app-icons',
      icons.map(({ id }) => ({
        name: id,
        ios: `./assets/app-icons/ios/${id}.png`,
        android: {
          foregroundImage: `./assets/app-icons/android/${id}-fg.png`,
          backgroundImage: `./assets/app-icons/android/${id}-bg.png`,
          monochromeImage: './assets/images/android-icon-monochrome.png',
        },
      })),
    ],
  ],
});
