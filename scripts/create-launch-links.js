import { miniAppLaunchUrl, sanitizeGrowthSource } from '../growth.js';

const [botArgument, appArgument = '', ...sourceArguments] = process.argv.slice(2);
const botUsername = botArgument || process.env.TELEGRAM_BOT_USERNAME || '';
const appShortName = appArgument === '-' ? '' : appArgument || process.env.TELEGRAM_APP_SHORT_NAME || '';
const sources = sourceArguments.length
  ? sourceArguments
  : ['x_launch', 'telegram_channel', 'partner_01', 'partner_02', 'community_01'];

if (!botUsername) {
  console.error('Usage: node scripts/create-launch-links.js <bot_username> <app_short_name|-> [source ...]');
  process.exit(1);
}

for (const rawSource of sources) {
  const source = sanitizeGrowthSource(rawSource);
  const url = miniAppLaunchUrl({ botUsername, appShortName }, `SRC_${source}`);
  if (!url) {
    console.error('Bot username or Mini App short name is invalid.');
    process.exit(1);
  }
  console.log(`${source}\t${url}`);
}
