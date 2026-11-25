// The SendMyBeat icon's holiday and event versions. Each one is built into the app (see
// app.config.js), so a new icon here needs a new build. Ids match the native icon names.

export type AppIconId = 'NewYear' | 'LunarNewYear' | 'ValentinesDay' | 'ValentineBlush' | 'StPatricksDay' | 'Spring' | 'Easter' | 'AprilFools' | 'EarthDay' | 'MothersDay' | 'PrideMonth' | 'FathersDay' | 'Summer' | 'FourthOfJuly' | 'BackToSchool' | 'Halloween' | 'HalloweenPumpkin' | 'SpookyPurple' | 'Diwali' | 'Thanksgiving' | 'BlackFriday' | 'CyberMonday' | 'Christmas' | 'ChristmasTree' | 'SnowDay' | 'Hanukkah' | 'Kwanzaa' | 'RamadanAndEid' | 'NewYearsEve' | 'AwardsNight' | 'BeatBattle' | 'RecordStoreDay' | 'WorldMusicDay' | 'HipHopDay' | 'FestivalSeason' | 'SendMyBeatBirthday' | 'Milestone' | 'LoFi' | 'Synthwave' | 'Midnight' | 'LightMode' | 'Gold' | 'Platinum' | 'Diamond' | 'Neon' | 'Mono' | 'BigGame' | 'SolarEclipse' | 'CherryBlossom' | 'Autumn';

export type AppIconInfo = { id: AppIconId; name: string; preview: number };

export const DEFAULT_ICON_PREVIEW: number = require('@/assets/app-icons/preview/Default.png');

export const APP_ICONS: AppIconInfo[] = [
  { id: 'NewYear', name: 'New Year', preview: require('@/assets/app-icons/preview/NewYear.png') },
  { id: 'LunarNewYear', name: 'Lunar New Year', preview: require('@/assets/app-icons/preview/LunarNewYear.png') },
  { id: 'ValentinesDay', name: 'Valentine\'s Day', preview: require('@/assets/app-icons/preview/ValentinesDay.png') },
  { id: 'ValentineBlush', name: 'Valentine Blush', preview: require('@/assets/app-icons/preview/ValentineBlush.png') },
  { id: 'StPatricksDay', name: 'St. Patrick\'s Day', preview: require('@/assets/app-icons/preview/StPatricksDay.png') },
  { id: 'Spring', name: 'Spring', preview: require('@/assets/app-icons/preview/Spring.png') },
  { id: 'Easter', name: 'Easter', preview: require('@/assets/app-icons/preview/Easter.png') },
  { id: 'AprilFools', name: 'April Fools', preview: require('@/assets/app-icons/preview/AprilFools.png') },
  { id: 'EarthDay', name: 'Earth Day', preview: require('@/assets/app-icons/preview/EarthDay.png') },
  { id: 'MothersDay', name: 'Mother\'s Day', preview: require('@/assets/app-icons/preview/MothersDay.png') },
  { id: 'PrideMonth', name: 'Pride Month', preview: require('@/assets/app-icons/preview/PrideMonth.png') },
  { id: 'FathersDay', name: 'Father\'s Day', preview: require('@/assets/app-icons/preview/FathersDay.png') },
  { id: 'Summer', name: 'Summer', preview: require('@/assets/app-icons/preview/Summer.png') },
  { id: 'FourthOfJuly', name: 'Fourth of July', preview: require('@/assets/app-icons/preview/FourthOfJuly.png') },
  { id: 'BackToSchool', name: 'Back to School', preview: require('@/assets/app-icons/preview/BackToSchool.png') },
  { id: 'Halloween', name: 'Halloween', preview: require('@/assets/app-icons/preview/Halloween.png') },
  { id: 'HalloweenPumpkin', name: 'Halloween Pumpkin', preview: require('@/assets/app-icons/preview/HalloweenPumpkin.png') },
  { id: 'SpookyPurple', name: 'Spooky Purple', preview: require('@/assets/app-icons/preview/SpookyPurple.png') },
  { id: 'Diwali', name: 'Diwali', preview: require('@/assets/app-icons/preview/Diwali.png') },
  { id: 'Thanksgiving', name: 'Thanksgiving', preview: require('@/assets/app-icons/preview/Thanksgiving.png') },
  { id: 'BlackFriday', name: 'Black Friday', preview: require('@/assets/app-icons/preview/BlackFriday.png') },
  { id: 'CyberMonday', name: 'Cyber Monday', preview: require('@/assets/app-icons/preview/CyberMonday.png') },
  { id: 'Christmas', name: 'Christmas', preview: require('@/assets/app-icons/preview/Christmas.png') },
  { id: 'ChristmasTree', name: 'Christmas Tree', preview: require('@/assets/app-icons/preview/ChristmasTree.png') },
  { id: 'SnowDay', name: 'Snow Day', preview: require('@/assets/app-icons/preview/SnowDay.png') },
  { id: 'Hanukkah', name: 'Hanukkah', preview: require('@/assets/app-icons/preview/Hanukkah.png') },
  { id: 'Kwanzaa', name: 'Kwanzaa', preview: require('@/assets/app-icons/preview/Kwanzaa.png') },
  { id: 'RamadanAndEid', name: 'Ramadan and Eid', preview: require('@/assets/app-icons/preview/RamadanAndEid.png') },
  { id: 'NewYearsEve', name: 'New Year\'s Eve', preview: require('@/assets/app-icons/preview/NewYearsEve.png') },
  { id: 'AwardsNight', name: 'Awards Night', preview: require('@/assets/app-icons/preview/AwardsNight.png') },
  { id: 'BeatBattle', name: 'Beat Battle', preview: require('@/assets/app-icons/preview/BeatBattle.png') },
  { id: 'RecordStoreDay', name: 'Record Store Day', preview: require('@/assets/app-icons/preview/RecordStoreDay.png') },
  { id: 'WorldMusicDay', name: 'World Music Day', preview: require('@/assets/app-icons/preview/WorldMusicDay.png') },
  { id: 'HipHopDay', name: 'Hip Hop Day', preview: require('@/assets/app-icons/preview/HipHopDay.png') },
  { id: 'FestivalSeason', name: 'Festival Season', preview: require('@/assets/app-icons/preview/FestivalSeason.png') },
  { id: 'SendMyBeatBirthday', name: 'SendMyBeat Birthday', preview: require('@/assets/app-icons/preview/SendMyBeatBirthday.png') },
  { id: 'Milestone', name: 'Milestone', preview: require('@/assets/app-icons/preview/Milestone.png') },
  { id: 'LoFi', name: 'Lo-fi', preview: require('@/assets/app-icons/preview/LoFi.png') },
  { id: 'Synthwave', name: 'Synthwave', preview: require('@/assets/app-icons/preview/Synthwave.png') },
  { id: 'Midnight', name: 'Midnight', preview: require('@/assets/app-icons/preview/Midnight.png') },
  { id: 'LightMode', name: 'Light Mode', preview: require('@/assets/app-icons/preview/LightMode.png') },
  { id: 'Gold', name: 'Gold', preview: require('@/assets/app-icons/preview/Gold.png') },
  { id: 'Platinum', name: 'Platinum', preview: require('@/assets/app-icons/preview/Platinum.png') },
  { id: 'Diamond', name: 'Diamond', preview: require('@/assets/app-icons/preview/Diamond.png') },
  { id: 'Neon', name: 'Neon', preview: require('@/assets/app-icons/preview/Neon.png') },
  { id: 'Mono', name: 'Mono', preview: require('@/assets/app-icons/preview/Mono.png') },
  { id: 'BigGame', name: 'Big Game', preview: require('@/assets/app-icons/preview/BigGame.png') },
  { id: 'SolarEclipse', name: 'Solar Eclipse', preview: require('@/assets/app-icons/preview/SolarEclipse.png') },
  { id: 'CherryBlossom', name: 'Cherry Blossom', preview: require('@/assets/app-icons/preview/CherryBlossom.png') },
  { id: 'Autumn', name: 'Autumn', preview: require('@/assets/app-icons/preview/Autumn.png') },
];

export const iconInfo = (id: AppIconId | null) => (id ? APP_ICONS.find((i) => i.id === id) ?? null : null);
