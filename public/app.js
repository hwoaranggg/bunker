const tg = window.Telegram?.WebApp;
const $ = id => document.getElementById(id);

/* ── Feel: audio + reduced-motion ────────────────────────────────────────────
 * A Mini App gets one cold start; shipping audio files would cost a request and
 * a decode. Instead every sound is synthesised on the fly from a single shared
 * AudioContext — a short osc + gain envelope. Zero assets, zero network, and it
 * stays silent until the first user gesture (autoplay policy) and whenever the
 * OS reports reduced-motion, so it never fights accessibility settings. */
const feel = {
  ctx: null,
  ready: false,
  muted: false,
  reduceMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  ensure() {
    if (this.ready || this.muted) return this.ctx;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) { this.muted = true; return null; }
      this.ctx = new Ctx();
      this.ready = true;
    } catch { this.muted = true; }
    return this.ctx;
  },
  // A single percussive blip. freq/duration/gain/type shape the character; a
  // fast exponential decay keeps every hit tight so rapid taps don't smear.
  blip(freq = 660, { duration = 0.06, gain = 0.05, type = 'triangle', slideTo = null } = {}) {
    const ctx = this.ensure();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), now + duration);
    amp.gain.setValueAtTime(0.0001, now);
    amp.gain.exponentialRampToValueAtTime(gain, now + 0.006);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(amp).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  },
  // Named cues. The scan click rises in pitch with the combo level, so the ear
  // hears the streak building — the exact reward loop idle clickers live on.
  scan(comboLevel = 0) {
    const step = Math.min(20, Math.max(0, comboLevel));
    this.blip(560 + step * 22, { duration: 0.05, gain: 0.045, type: 'square' });
  },
  comboUp() { this.blip(720, { duration: 0.08, gain: 0.05, type: 'triangle', slideTo: 1080 }); },
  reward() {
    this.blip(660, { duration: 0.09, gain: 0.05, type: 'triangle', slideTo: 990 });
    setTimeout(() => this.blip(990, { duration: 0.12, gain: 0.045, type: 'triangle', slideTo: 1320 }), 70);
  },
  error() { this.blip(200, { duration: 0.14, gain: 0.05, type: 'sawtooth', slideTo: 130 }); },
  unlock() {
    [0, 90, 180].forEach((delay, i) =>
      setTimeout(() => this.blip(600 + i * 260, { duration: 0.12, gain: 0.05, type: 'triangle' }), delay));
  }
};

const I18N = {
  en: {
    authKicker: 'BUILD YOUR INTELLIGENCE NETWORK', authTitle: 'Catch the signal before the market does.', authText: 'Scan live anomalies, upgrade your technology and earn a place in the seasonal airdrop ranking.', enter: 'Enter network', connecting: 'Establishing secure uplink…',
    epochCta: 'Earn SP', epochTitle: 'Signal Epoch', epochText: 'Signal Points are limited. Earn while you can — they convert to the airdrop at 100%.', epochAirdropLabel: 'XRAD Airdrop', epochAirdropPct: (pct) => `${pct}% collected`, epochScanShort: 'Scan', epochFriendsShort: 'Friends', epochTerminalShort: 'Terminal',
    intel: 'Intel', energy: 'Energy', chips: 'Chips', scan: 'SCAN', networkOnline: 'NETWORK ONLINE', signalsDetected: 'SIGNALS DETECTED', dailyCombo: 'DAILY COMBO', seasonScore: 'SEASON SCORE', ready: 'Ready', completed: 'Completed', waiting: 'waiting',
    networkTech: 'NETWORK TECHNOLOGY', upgradeTitle: 'Build your edge', upgradeText: 'Every module increases passive Intel and unlocks stronger market signals.', passiveIncome: 'PASSIVE INCOME', offlineStorage: 'OFFLINE STORAGE',
    marketIntel: 'MARKET INTELLIGENCE', signalTitle: 'Intercepted signals', signalText: 'Read the evidence, make a call and build an accuracy streak.',
    dailyOps: 'DAILY OPERATIONS', missionTitle: 'Return with a purpose', missionText: 'Daily puzzles, signal forecasts and network objectives grow your season score.', resetsDaily: 'RESETS DAILY', comboTitle: 'Daily Combo', comboText: "Find today's secret set of three signal cards — shared by the community.", checkCombo: 'Check combination', oneCodeDaily: 'ONE CODE DAILY', cipherTitle: 'Signal Cipher', cipherText: 'Decode the five-letter market word shared by the community.', decode: 'Decode',
    seasonNetwork: 'SEASON NETWORK', networkText: 'Climb the leagues. Build a verified record. Prepare for the seasonal snapshot.', estimated: 'ESTIMATED', airdropTitle: 'Airdrop score', growNetwork: 'GROW THE NETWORK', referralTitle: 'Qualified referrals', referralText: 'A referral qualifies only after real play and a completed signal assessment.', share: 'Share', connect: 'Connect', refPlaceholder: 'Referral code', language: 'LANGUAGE', interfaceLanguage: 'Interface language', fullAnalysis: 'Full market analysis', open: 'Open ↗',
    refRewardKicker: 'NETWORK PAYOUT', refFriendKicker: 'RECRUIT CONFIRMED',
    refWelcomeTitle: 'Welcome kit', refWelcomeBody: 'You came in on an invitation, so the network fronts you a starting package. Spend it on your first modules — passive Intel starts the moment they are running.',
    refQualifiedTitle: 'You are on the record', refQualifiedBody: 'Level 3 and your first signal call behind you. That makes you a confirmed operator — and it pays both you and whoever brought you in.',
    refFriendTitle: 'Your recruit qualified', refFriendBody: (name) => `${name} reached level 3 and made their first call. Your passive Intel bonus just went up, and it keeps paying for as long as they play.`,
    refFriendFallback: 'An operator',
    friendsGive: (intel, chips) => `They start with +${intel} Intel and +${chips} ◆`,
    friendsBothPaid: (chips, sp) => `When they qualify: +${chips} ◆ for you, +${chips} ◆ and +${sp} SP for them`,
    friendsKicker: 'YOUR NETWORK', friendsTitle: 'Friends', friendsBonusLabel: 'PASSIVE BONUS', friendsBonusValue: (pct) => `+${pct}% Intel/h`, friendsBonusHint: (per, cap) => `Each qualified friend adds +${per}% passive Intel, up to +${cap}%.`, friendsBonusAtCap: 'Network bonus maxed out.', friendsCount: (n) => `${n} joined`, friendsInvite: 'Invite a friend', friendsEmpty: 'No friends yet. Invite one and earn a permanent passive bonus for every operator who plays.', friendsPending: 'Playing — not qualified yet', friendsQualified: 'Qualified', friendsLevel: (n) => `Lv ${n}`, friendsListTitle: 'Invited operators', friendsShareText: 'Join my XRadar intelligence network — read the market before it moves, and we both climb the season ranking:',
    friendsRankTitle: 'You vs your friends', friendsRankYou: 'You', friendsRankOf: (rank, total) => `#${rank} of ${total}`, friendsRankTop: 'Top of your network', friendsRankLead: (n) => `${n} SP ahead of you`, friendsRankBehind: (n) => `${n} SP behind you`,
    navRadar: 'Radar', navUpgrades: 'Upgrade', navSignals: 'Signals', navMissions: 'Missions', navNetwork: 'Network',
    income: 'Intel/h', level: 'Level', upgrade: 'Upgrade', unlock: 'Unlock', locked: 'Locked', max: 'MAX', building: 'Installing', cost: 'Cost', parts: 'Chips', unlockReq: 'Upgrade prerequisite modules',
    noSignals: 'Radar is quiet', noSignalsText: 'New market anomalies will appear when the scanner refreshes.', signalLocked: 'Complete the launch sequence to unlock market signals.', scanAvailable: 'signals ready',
    accuracy: 'Accuracy', attempts: 'Calls', correct: 'Correct', activity: 'Activity', liquidity: 'Liquidity', concentration: 'Top holders', change24h: '24h move', analyze: 'TRACK SIGNAL', skip: 'IGNORE RISK', signalEvidence: 'SIGNAL EVIDENCE', signalAssessment: 'Assessment complete', correctCall: 'Signal confirmed. Your read was correct.', wrongCall: 'Signal reviewed. Use the new evidence on your next call.',
    currentDirective: 'CURRENT DIRECTIVE', launchSequence: 'Launch sequence', operationRunning: 'Operation running', completeSetup: 'Complete network initialization', goSignals: 'Analyze first signal', goUpgrade: 'Install the Power Cell', taskUpgrade: 'Upgrade technology', taskSignal: 'Assess a market signal', taskSupply: 'Claim the chip drop', taskCalibrate: 'Calibrate the radar core',
    selectThree: 'Pick three signal cards', comboHint: 'The combination is global for every operator and resets each day. Find it in the community or crack it yourself.', submitCombo: 'Check combination', wrongCombo: 'Wrong combination. The network signature does not match.', comboSuccess: 'Daily Combo complete!', cipherSuccess: 'Cipher decoded: +500 Intel, +1 Chip and +20 SP.', cipherWrong: 'Incorrect code. Check the community clue and try again.',
    comboAttempts: 'Attempts', comboAttemptsLeft: (n) => `${n} left`, comboNoAttempts: 'No attempts left today — resets tomorrow.', comboNearMiss: (n) => `${n} of 3 correct. Keep looking.`, comboStreak: 'Combo streak', comboStreakDays: (n) => `${n}-day streak`, comboMultiplier: (m) => `×${m} Signal Points`, comboRewardLine: (sp, mult) => mult > 1 ? `+1,500 Intel · +2 Chips · +${sp} SP (×${mult})` : `+1,500 Intel · +2 Chips · +${sp} SP`, comboShare: 'Share combo', comboShareText: (cards) => `🎯 Today's XRadar Daily Combo: ${cards}\n\nSolve it, climb the Signal ranking, and see the market before it moves. Open XRadar:`, comboShared: 'Combo copied — share it and earn referrals.', comboSlotEmpty: 'Tap to pick',
    sweepShort: 'SIGNAL SWEEP', sweepScore: 'SCORE', sweepCombo: 'COMBO', sweepTime: 'TIME', sweepKicker: 'SIGNAL SWEEP', sweepTitle: 'Catch the green. Dodge the rug.', sweepIntro: 'Tap safe signals as they fall. Avoid the red rugs — they break your combo. 30 seconds on the clock.', sweepGood: 'Safe · +10', sweepBonus: 'Alpha · +40', sweepRug: 'Rug · −25', sweepPlay: 'Start sweep · 20 ⚡', sweepAgain: 'Play again · 20 ⚡', sweepExit: 'Done', sweepDone: 'SWEEP COMPLETE', sweepReward: (sp) => sp > 0 ? `+${sp} Signal Points` : 'No Signal Points this round', sweepCapReached: 'Daily Signal Points from Sweep reached — score still counts toward your best.', sweepGoods: 'Caught', sweepRugs: 'Rugs hit', sweepMaxCombo: 'Best combo', sweepBest: 'Best score', sweepLowEnergy: 'Not enough Energy — 20 required.', sweepNoEnergyShort: 'Low energy', sweepInProgress: 'Round already running.',
    tribeKicker: 'TRIBE', tribeTitle: 'Squad up for a Signal boost', tribeIntro: 'Join a tribe and every Signal Point you earn is multiplied. The bigger the active roster, the bigger the boost — up to ×1.5.', tribeCreate: 'Create tribe', tribeJoin: 'Join', tribeLeave: 'Leave tribe', tribeInvitePlaceholder: 'Invite code', tribeNamePlaceholder: 'Tribe name', tribeChooseFaction: 'Choose your faction', tribeCreateTitle: 'Create a tribe', tribeMembers: (n, max) => `${n}/${max} members`, tribeBoost: (m) => `×${m} Signal Points`, tribeInvite: 'Invite code', tribeShareInvite: 'Share invite', tribeShareText: (name, code) => `⚔️ Join my XRadar tribe "${name}" — code ${code}. We stack a Signal Point multiplier the more we are. Play and boost with me:`, tribeInviteCopied: 'Invite copied — bigger tribe, bigger boost.', tribeStandings: 'Tribe standings', tribeLeader: 'Leader', tribeYou: 'you', tribeLeaveConfirm: 'Leave this tribe? Your Signal boost ends.', tribeLeft: 'You left the tribe.', tribeCreated: 'Tribe created — invite your squad!', tribeJoined: 'Joined the tribe. Boost active.', tribeNoneShort: 'No tribe', tribeSoloHint: 'Solo — invite members to activate the multiplier.', tribeJoinPrefilled: 'Invite ready — tap Join to lock in the boost.', factionScout: 'Scout', factionWallet: 'Wallet Intel', factionRisk: 'Risk Guard', factionMomentum: 'Momentum', farmLabel: 'SIGNAL FARM', farmCollect: 'Collect', farmFull: 'Full — collect now', farmRate: (n) => `+${n}/h · fills in 8h`, farmCollected: (n) => `+${n} Intel collected. Farm restarted.`, farmEmpty: 'Nothing to collect yet.',
    questKicker: 'EARN MORE', questTitle: 'Signal quests', questGo: 'Go', questClaim: 'Claim', questClaimed: 'Done', questReward: (sp) => `+${sp} SP`, questClaimedToast: (sp) => `+${sp} Signal Points claimed.`, questArm: 'Complete the action, then claim.',
    quest_follow_channel: 'Follow the XRadar channel', quest_join_chat: 'Join the XRadar chat', quest_follow_x: 'Follow XRadar on X', quest_open_terminal: 'Open the XRadar terminal', quest_connect_wallet: 'Connect your TON wallet', quest_first_trade: 'Make your first trade in XRadar', quest_trade_volume: 'Trade $100 in XRadar', quest_share_game: 'Share the game with a friend', quest_invite_one: 'Invite 1 friend', quest_invite_five: 'Invite 5 friends', academyKicker: 'LEARN & EARN', academyTitle: 'XRadar Academy', academyText: "Learn the concepts XRadar's verdicts use — earn Signal Points for each lesson.", academyProgress: (n, total) => `${n}/${total}`, academyStart: 'Start', academyDone: 'Done', academyCorrect: (sp) => `Correct! +${sp} Signal Points.`, academyWrong: 'Not quite — read the explanation and try the next one.', academyNext: 'Got it',
    briefingKicker: 'DAILY BRIEFING', briefingTitle: "Today's briefing", briefingText: "Read the briefing and enter the code word in caps to claim.", briefingPlaceholder: 'Code word', briefingSubmit: 'Claim', briefingClaimed: 'Claimed today', briefingWrong: (left) => `Not the right word. ${left} attempts left today.`, briefingNoAttempts: 'No attempts left today — come back tomorrow.', briefingCorrect: (sp) => `Correct! +${sp} Signal Points.`, briefingStreak: (n) => `${n}-day briefing streak`, briefingReward: (sp) => `+${sp} SP`, briefingBackTomorrow: 'New briefing tomorrow.',
    brief_liquidity_depth: { title: 'Liquidity depth', body: 'Thin liquidity means your own order moves the price against you. Before entering, check how much is actually pooled — not just the market cap. The word to remember for how far the book goes: DEPTH.' },
    brief_stop_discipline: { title: 'Stop discipline', body: 'A plan you abandon at the first red candle was never a plan. Decide your exit before you enter and let it do its job. The order type that enforces it: STOPLOSS.' },
    brief_fake_volume: { title: 'Fake volume', body: 'Volume can be manufactured by wallets trading with themselves to look active. Real interest leaves a spread of distinct holders. The name for that fake churn: WASHOUT.' },
    brief_holder_spread: { title: 'Holder spread', body: 'If ten wallets hold most of the supply, price is theirs to decide. A healthy chart has its supply distributed. What you want across holders: SPREAD.' },
    brief_unlock_cliff: { title: 'Unlock cliff', body: 'Tokens locked at launch return to the market on a schedule, often all at once. Check the calendar before the date, not after. That sudden release point: CLIFF.' },
    brief_smart_wallets: { title: 'Smart wallets', body: 'Some addresses are consistently early and consistently right. Tracking them is more useful than tracking price. What you do with those wallets: FOLLOW.' },
    brief_risk_sizing: { title: 'Risk sizing', body: 'The trade that ruins you is the one you sized too large, not the one you picked wrong. Risk a fixed small share of the account per position. The discipline: SIZING.' },
    brief_exit_plan: { title: 'Exit plan', body: 'Entries are easy and exits are where the money is decided. Know your target and your invalidation before you click buy. The half everyone skips: EXIT.' },
    brief_narrative_cycle: { title: 'Narrative rotation', body: 'Attention moves between sectors in cycles — what led last month rarely leads this one. Follow where flow is arriving. That movement between narratives: ROTATION.' },
    brief_fee_drag: { title: 'Fee drag', body: 'On thin pairs the price you get is worse than the price you saw, and every round trip pays that gap. Small on one trade, ruinous across a hundred. The gap itself: SLIPPAGE.' },
    ladderKicker: 'DAILY REWARDS', ladderTitle: 'Login streak', ladderDay: (n) => `Day ${n}`, ladderToday: 'Today', ladderClaimed: 'Claimed', ladderStreakLabel: (n) => `${n}-day streak`, ladderBest: (n) => `best ${n}`, ladderHint: 'Open the app every day — the run resets if you miss one.',
    navTerminal: 'Terminal', terminalKicker: 'XRADAR TERMINAL', terminalTitle: 'Trade the signals', terminalText: 'Everything you learned here works on the live market. Verified trades pay Signal Points back into your season score.', terminalOpenCta: 'Open the terminal ↗', terminalRate: (sp) => `Every verified trade pays ${sp} Signal Points, plus a rate on volume.`, terminalUnavailable: 'The terminal is not linked to this build yet.',
    profileDays: (n) => `${n} days active`, profileGroupActivity: 'ACTIVITY', profileGroupSkill: 'SIGNAL READING', profileGroupPositions: 'POSITIONS', profileGroupHabit: 'CONSISTENCY', profileGroupBuild: 'NETWORK BUILD', profileTaps: 'Total scans', profileSweepBest: 'Sweep best score', profileSweepRounds: 'Sweep rounds', profileAssessments: 'Assessments correct', profileAccuracy: 'All-time accuracy', profileLiveCalls: 'Live calls', profilePositions: 'Positions won', profilePositionStreak: 'Best position streak', profileSeasonSp: 'Season Signal Points', profileStreak: 'Login streak', profileBriefings: 'Briefings claimed', profileReferrals: 'Qualified referrals', profileModuleLevels: 'Total module levels', profileAchievements: 'Achievements', profileGear: 'Gear owned',
    streak: 'Day streak', dailyCalls: 'Daily calls', signalPoints: 'Signal Points', tapBoostBadge: (mult, left) => `×${mult} BONUS · ${left} left`, season: 'Season', nextLeague: 'Next league', topLeague: 'Maximum league reached',
    scoreNetwork: 'Network', scoreAccuracy: 'Accuracy', scoreActivity: 'Activity', scoreXradar: 'XRadar', scoreReferrals: 'Referrals', scoreSignalPoints: 'Signal Points',
    reportKicker: 'WELCOME BACK', reportTitle: 'Scout kept scanning', collect: 'Collect report', reportText: (hours) => `Your network kept working while you were away — ${hours}h of Intel, collected.`,
    welcomeKicker: 'WELCOME, OPERATOR', welcomeTitle: 'Your intelligence network is live', welcomeBody: 'Tap the radar to scan the market for Intel, hunt live token signals, and climb the seasonal airdrop ranking. Every scan and every correct call builds your record.', welcomeBullet1: 'Tap to scan — earn Intel and discover signals', welcomeBullet2: 'Read signals — track or ignore, and stake your conviction', welcomeBullet3: 'Climb the leagues — earn Signal Points toward the airdrop', welcomeCta: 'Start scanning',
    spinKicker: 'DAILY REWARD', spinTitle: 'Spin the wheel', spinCta: 'Free spin', spinSpinning: 'Spinning…', spinDone: 'Come back tomorrow for another spin.', spinStreakLabel: (n) => `${n}-day streak`, spinWon: (r) => `You won ${r}!`, spinNextFree: 'Next free spin tomorrow',
    lootboxKicker: 'CHESTS', lootboxTitle: 'Open your chests', lootboxOpen: 'Open', lootboxOpening: 'Opening…', lootboxEmpty: 'No chests yet — earn them from spins and quests.', lootboxStandard: 'Standard chest', lootboxPremium: 'Premium chest', lootboxWon: (r) => `Chest opened: ${r}`,
    walletKicker: 'WALLET', walletTitle: 'Connect your wallet', walletText: 'Connect a TON wallet to qualify for the airdrop and claim a one-time reward.', walletConnect: 'Connect wallet', walletConnecting: 'Connecting…', walletDisconnect: 'Disconnect', walletConnectedLabel: 'Wallet connected', walletConnectedReward: (sp, c) => `Wallet connected. +${sp} SP, +${c} chips.`, walletRequired: 'Required for airdrop eligibility', walletShort: (a) => `${a.slice(0, 6)}…${a.slice(-4)}`, walletError: 'Could not connect the wallet. Try again.',
    scoreWallet: 'Wallet',
    tabXradar: 'XRadar', tabMarkets: 'Markets',
    mSortHot: 'Hot', mSortNew: 'New', mSortCap: 'Top', mCreators: 'Top creators',
    mCreateTitle: 'List your own market', mCreateKicker: 'CREATE',
    mCreateText: (cost, seed) => `Costs ${cost} Intel to list plus a starter position of ${seed} shares. One market per week.`,
    mTicker: 'Ticker', mName: 'Name', mCreateCta: 'List market', mCreating: 'Listing…',
    mCooldown: (h) => `Next listing available in ${h}h`,
    mPrice: 'Price', mSupply: 'Supply', mHolders: 'Holders', mVolume: 'Volume', mTraders: 'Traders',
    mBuy: 'Buy', mSell: 'Sell', mRedeem: 'Redeem', mBuying: 'Buying…', mSelling: 'Selling…',
    mYours: (shares) => `You hold ${shares}`,
    mEnds: (t) => `ends in ${t}`, mSettled: 'Settled', mEmpty: 'No markets yet — be the first to list one.',
    mBought: (shares, ticker) => `Bought ${shares} shares of $${ticker}`,
    mSold: (intel) => `Sold for ${intel} Intel`,
    mRedeemed: (intel) => `Redeemed ${intel} Intel`,
    mCreated: (ticker) => `$${ticker} is live`,
    mIntelAmount: 'Intel to spend', mShareAmount: 'Shares to sell',
    mMineTitle: 'Your markets', mSeasonSp: (used, cap) => `${used} / ${cap} market SP this season`,
    mRule: 'Signal Points come from unique traders your market attracts — never from profit.',
    mCurve: (base, slope) => `price = ${base} + ${slope} × supply`,
    mBurn: (pct) => `${pct}% burns on every trade`,
    shopKicker: 'STATION STORE', shopTitle: 'Boosts & passes', shopStars: 'Stars', shopTon: 'TON', shopBuy: 'Buy', shopBusy: 'Opening…', shopPaid: 'Purchase complete.', shopPending: 'Waiting for payment confirmation…', shopUnavailable: 'Payments are not available right now.', shopVerify: 'I have paid', shopVerifying: 'Checking the blockchain…',
    product_energy_refill: 'Full power reserve', product_parts_pack: '20 construction parts', product_instant_finish: 'Instant operation', product_operator_pass: 'Operator Pass · 30 days', product_cosmetic_station_pack: 'Station cosmetic pack',
    product_energy_refill_desc: 'Refill station Power to maximum.', product_parts_pack_desc: 'A secured shipment of upgrade Parts.', product_instant_finish_desc: 'Complete one active station job immediately.', product_operator_pass_desc: 'Expanded storage, second construction slot and daily Parts.', product_cosmetic_station_pack_desc: 'Unlock alternate neon, floor and operator suit styles.',
    resourceIntel: 'Intel funds module upgrades. It is produced actively by scanning and passively by your network.', resourceEnergy: 'Energy powers active scans. Power Cell upgrades increase capacity and regeneration.', resourceChips: 'Chips are a rare upgrade material earned from signals, daily puzzles and qualified referrals.',
    copied: 'Referral code copied.', connected: 'Referral connected.', languageSaved: 'Language changed.', notConfigured: 'Connect XRADAR_BASE_URL to enable the full analysis.', shareText: 'Join my XRadar intelligence network.',
    revealTitle: 'SIGNAL DECLASSIFIED', revealLive: 'Live token from the XRadar feed', revealSince: 'move after XRadar flagged it', revealHour: 'move over the last hour', revealScore: 'XRadar score', revealOpen: 'Track it in XRadar ↗', revealShare: 'Share this call',
    revealShareText: (symbol, move, correct) => `${correct ? 'Called it' : 'Missed it'}: $${symbol} did ${move} on the XRadar live feed. Can you read the signal before the market?`,
    achTitle: 'ACHIEVEMENTS', achEarned: 'earned', achLocked: 'Locked', achUnlocked: 'ACHIEVEMENT UNLOCKED', achReward: 'Reward', achGear: 'Gear unlocked', achClose: 'Continue',
    gearTitle: 'OPERATOR GEAR', gearEquip: 'Equip', gearEquipped: 'Equipped', gearSlotBody: 'Body', gearSlotTool: 'Tool', gearSlotHead: 'Head', gearNone: 'Nothing recovered yet.',
    posTitle: 'CONVICTION', posHelp: 'Stake Intel and choose how long to hold. The outcome is the real move of a real token.', posStake: 'Stake', posHorizon: 'Horizon', posOpen: 'OPEN POSITION', posIgnore: 'IGNORE',
    posOpened: 'Position opened. Come back when it resolves.', posOpenTitle: 'OPEN POSITIONS', posReady: 'Ready to reveal', posSettle: 'Reveal', posSettling: 'Revealing…', posStaked: 'staked', posNoLive: 'Live signals unavailable — the radar feed is still warming up.',
    posRecord: 'TRACK RECORD', posWinRate: 'Win rate', posRealized: 'Realized', posStreak: 'Streak', posBest: 'Best call', posSettled: 'Positions closed', posResult: 'Position closed', posReturned: 'Returned', posProfit: 'Profit', posLoss: 'Loss',
    convKicker: 'XRADAR TERMINAL', convTitle: 'Trade what you just called', convText: 'Take your reads to the live terminal. Make your first trade in XRadar and claim the operator bonus.', convOpen: 'Open XRadar ↗', convClaim: 'Claim +10 ◆', convClaimed: 'Operator bonus claimed', convVerified: 'Trade verified. +10 Chips added.', convNotVerified: 'No confirmed trade found on your XRadar account yet.',
    tradeLadderTitle: 'Trading rank', tradeLadderText: 'Your real, XRadar-verified trading earns Signal Points and lifts your trading rank.', tradeSync: 'Sync trading', tradeSynced: (sp) => sp > 0 ? `+${sp} Signal Points from your XRadar trades.` : 'No new verified trades since last sync.', tradeNotVerified: 'Connect and trade in XRadar to start earning. No verified account yet.', tradeUnavailable: 'Trading sync is not available right now.', tradeVolume: 'Verified volume', tradeCount: 'Verified trades', tradeEarned: 'SP from trading', tradeRankNext: (rank, vol) => `Next: ${rank} at $${vol}`, tradeRankMax: 'Top trading rank reached',
    rankUnranked: 'Unranked', rankRookie: 'Rookie', rankTrader: 'Trader', rankSharp: 'Sharp', rankWhale: 'Whale',
    observer: 'Observer', scout: 'Scout', analyst: 'Analyst', hunter: 'Signal Hunter', detective: 'Market Detective', operator: 'Alpha Operator', oracle: 'Oracle'
  },
  ru: {
    authKicker: 'ПОСТРОЙ СЕТЬ КРИПТОРАЗВЕДКИ', authTitle: 'Поймай сигнал раньше рынка.', authText: 'Сканируй аномалии, улучшай технологии и поднимайся в сезонном рейтинге airdrop.', enter: 'Войти в сеть', connecting: 'Устанавливаем защищённое соединение…',
    epochCta: 'Заработать SP', epochTitle: 'Сигнальная Эпоха', epochText: 'Signal Points ограничены. Зарабатывай, пока можешь — они конвертируются в airdrop при 100%.', epochAirdropLabel: 'XRAD Airdrop', epochAirdropPct: (pct) => `${pct}% собрано`, epochScanShort: 'Радар', epochFriendsShort: 'Друзья', epochTerminalShort: 'Терминал',
    intel: 'Интел', energy: 'Энергия', chips: 'Чипы', scan: 'СКАН', networkOnline: 'СЕТЬ АКТИВНА', signalsDetected: 'ОБНАРУЖЕНО СИГНАЛОВ', dailyCombo: 'КОМБО ДНЯ', seasonScore: 'СЕЗОННЫЙ СЧЁТ', ready: 'Готово', completed: 'Выполнено', waiting: 'ожидают',
    networkTech: 'ТЕХНОЛОГИИ СЕТИ', upgradeTitle: 'Создай преимущество', upgradeText: 'Каждый модуль увеличивает пассивный Интел и открывает более сильные сигналы.', passiveIncome: 'ПАССИВНЫЙ ДОХОД', offlineStorage: 'ОФЛАЙН-ХРАНИЛИЩЕ',
    marketIntel: 'РЫНОЧНАЯ РАЗВЕДКА', signalTitle: 'Перехваченные сигналы', signalText: 'Изучи данные, прими решение и собирай серию точных прогнозов.',
    dailyOps: 'ЕЖЕДНЕВНЫЕ ОПЕРАЦИИ', missionTitle: 'Возвращайся с целью', missionText: 'Загадки, прогнозы и задания сети увеличивают сезонный счёт.', resetsDaily: 'СБРОС КАЖДЫЙ ДЕНЬ', comboTitle: 'Комбо дня', comboText: 'Найди секретный набор из трёх сигнальных карт — его ищет всё сообщество.', checkCombo: 'Проверить комбинацию', oneCodeDaily: 'ОДИН КОД В ДЕНЬ', cipherTitle: 'Шифр сигнала', cipherText: 'Расшифруй слово из пяти букв, которое ищет сообщество.', decode: 'Расшифровать',
    seasonNetwork: 'СЕЗОННАЯ СЕТЬ', networkText: 'Поднимайся по лигам, создавай подтверждённую историю и готовься к snapshot.', estimated: 'ПРЕДВАРИТЕЛЬНО', airdropTitle: 'Airdrop-рейтинг', growNetwork: 'РАСШИРЯЙ СЕТЬ', referralTitle: 'Активные рефералы', referralText: 'Реферал засчитывается только после реальной игры и оценки сигнала.', share: 'Поделиться', connect: 'Подключить', refPlaceholder: 'Реферальный код', language: 'ЯЗЫК', interfaceLanguage: 'Язык интерфейса', fullAnalysis: 'Полный анализ рынка', open: 'Открыть ↗',
    refRewardKicker: 'ВЫПЛАТА СЕТИ', refFriendKicker: 'РЕКРУТ ПОДТВЕРЖДЁН',
    refWelcomeTitle: 'Стартовый набор', refWelcomeBody: 'Ты пришёл по приглашению, и сеть выдаёт стартовый пакет. Вложи его в первые модули — пассивный Интел пойдёт, как только они заработают.',
    refQualifiedTitle: 'Ты в реестре', refQualifiedBody: 'Третий уровень и первая оценка сигнала позади. Ты подтверждённый оператор — и за это платят и тебе, и тому, кто тебя привёл.',
    refFriendTitle: 'Твой рекрут закрепился', refFriendBody: (name) => `${name} дошёл до 3 уровня и сделал первую оценку. Пассивный бонус вырос — и он капает, пока друг играет.`,
    refFriendFallback: 'Оператор',
    friendsGive: (intel, chips) => `Друг стартует с +${intel} Интела и +${chips} ◆`,
    friendsBothPaid: (chips, sp) => `Когда закрепится: +${chips} ◆ тебе, +${chips} ◆ и +${sp} SP ему`,
    friendsKicker: 'ТВОЯ СЕТЬ', friendsTitle: 'Друзья', friendsBonusLabel: 'ПАССИВНЫЙ БОНУС', friendsBonusValue: (pct) => `+${pct}% Интел/ч`, friendsBonusHint: (per, cap) => `Каждый активный друг добавляет +${per}% пассивного Интела, до +${cap}%.`, friendsBonusAtCap: 'Бонус сети на максимуме.', friendsCount: (n) => `${n} присоединилось`, friendsInvite: 'Пригласить друга', friendsEmpty: 'Пока нет друзей. Пригласи — и получай постоянный пассивный бонус за каждого играющего оператора.', friendsPending: 'Играет — ещё не активен', friendsQualified: 'Активен', friendsLevel: (n) => `Ур. ${n}`, friendsListTitle: 'Приглашённые операторы', friendsShareText: 'Вступай в мою сеть крипторазведки XRadar — читай рынок раньше остальных, и мы оба поднимаемся в сезонном рейтинге:',
    friendsRankTitle: 'Ты против друзей', friendsRankYou: 'Ты', friendsRankOf: (rank, total) => `#${rank} из ${total}`, friendsRankTop: 'Лидер твоей сети', friendsRankLead: (n) => `${n} SP впереди тебя`, friendsRankBehind: (n) => `${n} SP позади тебя`,
    navRadar: 'Радар', navUpgrades: 'Модули', navSignals: 'Сигналы', navMissions: 'Задания', navNetwork: 'Сеть',
    income: 'Интел/ч', level: 'Уровень', upgrade: 'Улучшить', unlock: 'Открыть', locked: 'Закрыто', max: 'МАКС', building: 'Установка', cost: 'Цена', parts: 'Чипы', unlockReq: 'Улучши необходимые модули',
    noSignals: 'Радар молчит', noSignalsText: 'Новые рыночные аномалии появятся после обновления сканера.', signalLocked: 'Заверши запуск сети, чтобы открыть рыночные сигналы.', scanAvailable: 'сигналов готово',
    accuracy: 'Точность', attempts: 'Прогнозы', correct: 'Верные', activity: 'Активность', liquidity: 'Ликвидность', concentration: 'Топ-холдеры', change24h: 'Изменение 24ч', analyze: 'ОТСЛЕЖИВАТЬ', skip: 'ИГНОРИРОВАТЬ РИСК', signalEvidence: 'ДАННЫЕ СИГНАЛА', signalAssessment: 'Анализ завершён', correctCall: 'Сигнал подтверждён. Твой прогноз оказался верным.', wrongCall: 'Сигнал изучен. Используй новые данные в следующем прогнозе.',
    currentDirective: 'ТЕКУЩАЯ ДИРЕКТИВА', launchSequence: 'Запуск сети', operationRunning: 'Операция выполняется', completeSetup: 'Заверши инициализацию сети', goSignals: 'Оцени первый сигнал', goUpgrade: 'Установи Энергоячейку', taskUpgrade: 'Улучши технологию', taskSignal: 'Оцени рыночный сигнал', taskSupply: 'Забери поставку чипов', taskCalibrate: 'Откалибруй ядро радара',
    selectThree: 'Выбери три сигнальные карты', comboHint: 'Комбинация одинакова для всех операторов и меняется каждый день. Ищи её у сообщества или разгадай сам.', submitCombo: 'Проверить комбинацию', wrongCombo: 'Неверная комбинация. Сигнатура сети не совпала.', comboSuccess: 'Комбо выполнено!', cipherSuccess: 'Шифр разгадан: +500 Интел, +1 Чип и +20 SP.', cipherWrong: 'Код неверный. Проверь подсказку сообщества и попробуй ещё раз.',
    comboAttempts: 'Попытки', comboAttemptsLeft: (n) => `осталось ${n}`, comboNoAttempts: 'Попытки на сегодня закончились — сброс завтра.', comboNearMiss: (n) => `${n} из 3 верно. Продолжай искать.`, comboStreak: 'Серия комбо', comboStreakDays: (n) => `серия ${n} дн.`, comboMultiplier: (m) => `×${m} Signal Points`, comboRewardLine: (sp, mult) => mult > 1 ? `+1 500 Интел · +2 Чипа · +${sp} SP (×${mult})` : `+1 500 Интел · +2 Чипа · +${sp} SP`, comboShare: 'Поделиться комбо', comboShareText: (cards) => `🎯 Комбо дня в XRadar: ${cards}\n\nРазгадай, поднимись в рейтинге сигналов и увидь рынок до того, как он двинется. Открыть XRadar:`, comboShared: 'Комбо скопировано — поделись и получи рефералов.', comboSlotEmpty: 'Нажми, чтобы выбрать',
    sweepShort: 'SIGNAL SWEEP', sweepScore: 'СЧЁТ', sweepCombo: 'КОМБО', sweepTime: 'ВРЕМЯ', sweepKicker: 'SIGNAL SWEEP', sweepTitle: 'Лови зелёные. Уворачивайся от рагов.', sweepIntro: 'Тапай безопасные сигналы, пока они падают. Избегай красных рагов — они сбивают комбо. 30 секунд на всё.', sweepGood: 'Безопасный · +10', sweepBonus: 'Альфа · +40', sweepRug: 'Раг · −25', sweepPlay: 'Начать · 20 ⚡', sweepAgain: 'Ещё раз · 20 ⚡', sweepExit: 'Готово', sweepDone: 'РАУНД ЗАВЕРШЁН', sweepReward: (sp) => sp > 0 ? `+${sp} Signal Points` : 'В этом раунде без Signal Points', sweepCapReached: 'Дневной лимит Signal Points со Sweep достигнут — счёт всё ещё идёт в рекорд.', sweepGoods: 'Поймано', sweepRugs: 'Рагов задето', sweepMaxCombo: 'Лучшее комбо', sweepBest: 'Рекорд', sweepLowEnergy: 'Недостаточно Энергии — нужно 20.', sweepNoEnergyShort: 'Мало энергии', sweepInProgress: 'Раунд уже идёт.',
    tribeKicker: 'ОТРЯД', tribeTitle: 'Собери отряд для буста Signal', tribeIntro: 'Вступи в отряд — и каждый заработанный Signal Point умножается. Чем больше активных участников, тем выше буст — до ×1.5.', tribeCreate: 'Создать отряд', tribeJoin: 'Вступить', tribeLeave: 'Покинуть отряд', tribeInvitePlaceholder: 'Код приглашения', tribeNamePlaceholder: 'Название отряда', tribeChooseFaction: 'Выбери фракцию', tribeCreateTitle: 'Создать отряд', tribeMembers: (n, max) => `${n}/${max} участников`, tribeBoost: (m) => `×${m} Signal Points`, tribeInvite: 'Код приглашения', tribeShareInvite: 'Поделиться', tribeShareText: (name, code) => `⚔️ Вступай в мой отряд XRadar «${name}» — код ${code}. Чем нас больше, тем выше множитель Signal Points. Играй и бустись со мной:`, tribeInviteCopied: 'Код скопирован — больше отряд, больше буст.', tribeStandings: 'Рейтинг отрядов', tribeLeader: 'Лидер', tribeYou: 'ты', tribeLeaveConfirm: 'Покинуть отряд? Твой буст Signal закончится.', tribeLeft: 'Ты покинул отряд.', tribeCreated: 'Отряд создан — зови своих!', tribeJoined: 'Ты в отряде. Буст активен.', tribeNoneShort: 'Нет отряда', tribeSoloHint: 'Один — позови участников, чтобы включить множитель.', tribeJoinPrefilled: 'Код готов — нажми «Вступить», чтобы получить буст.', factionScout: 'Scout', factionWallet: 'Wallet Intel', factionRisk: 'Risk Guard', factionMomentum: 'Momentum', farmLabel: 'SIGNAL FARM', farmCollect: 'Собрать', farmFull: 'Заполнено — собери', farmRate: (n) => `+${n}/ч · заполнится за 8ч`, farmCollected: (n) => `+${n} Интел собрано. Ферма перезапущена.`, farmEmpty: 'Пока нечего собирать.',
    questKicker: 'ЗАРАБОТАЙ БОЛЬШЕ', questTitle: 'Сигнальные квесты', questGo: 'Перейти', questClaim: 'Забрать', questClaimed: 'Готово', questReward: (sp) => `+${sp} SP`, questClaimedToast: (sp) => `+${sp} Signal Points получено.`, questArm: 'Выполни действие, затем забери награду.',
    quest_follow_channel: 'Подпишись на канал XRadar', quest_join_chat: 'Вступи в чат XRadar', quest_follow_x: 'Подпишись на XRadar в X', quest_open_terminal: 'Открой терминал XRadar', quest_connect_wallet: 'Подключи TON-кошелёк', quest_first_trade: 'Сделай первую сделку в XRadar', quest_trade_volume: 'Наторгуй на $100 в XRadar', quest_share_game: 'Поделись игрой с другом', quest_invite_one: 'Пригласи 1 друга', quest_invite_five: 'Пригласи 5 друзей', academyKicker: 'УЧИСЬ И ЗАРАБАТЫВАЙ', academyTitle: 'Академия XRadar', academyText: 'Изучи концепции, которые использует XRadar — получай Signal Points за каждый урок.', academyProgress: (n, total) => `${n}/${total}`, academyStart: 'Начать', academyDone: 'Готово', academyCorrect: (sp) => `Верно! +${sp} Signal Points.`, academyWrong: 'Почти — прочитай объяснение и попробуй следующий.', academyNext: 'Понятно',
    briefingKicker: 'СВОДКА ДНЯ', briefingTitle: 'Сводка на сегодня', briefingText: 'Прочитай сводку и введи кодовое слово заглавными, чтобы забрать награду.', briefingPlaceholder: 'Кодовое слово', briefingSubmit: 'Забрать', briefingClaimed: 'Сегодня получено', briefingWrong: (left) => `Не то слово. Осталось попыток сегодня: ${left}.`, briefingNoAttempts: 'Попытки на сегодня закончились — заходи завтра.', briefingCorrect: (sp) => `Верно! +${sp} Signal Points.`, briefingStreak: (n) => `Серия сводок: ${n} дн.`, briefingReward: (sp) => `+${sp} SP`, briefingBackTomorrow: 'Новая сводка завтра.',
    brief_liquidity_depth: { title: 'Глубина ликвидности', body: 'Тонкая ликвидность означает, что твоя же заявка двигает цену против тебя. Перед входом смотри, сколько реально в пуле, а не только капитализацию. Слово, обозначающее глубину книги заявок: DEPTH.' },
    brief_stop_discipline: { title: 'Дисциплина стопа', body: 'План, который ты бросаешь на первой красной свече, планом не был. Определи выход до входа и дай ему работать. Тип ордера, который это обеспечивает: STOPLOSS.' },
    brief_fake_volume: { title: 'Фальшивый объём', body: 'Объём можно нарисовать кошельками, торгующими сами с собой. Настоящий интерес оставляет много разных держателей. Название такой накрутки: WASHOUT.' },
    brief_holder_spread: { title: 'Распределение держателей', body: 'Если десять кошельков держат большую часть предложения — цена принадлежит им. У здорового графика предложение распределено. Что нужно среди держателей: SPREAD.' },
    brief_unlock_cliff: { title: 'Обрыв анлока', body: 'Токены, заблокированные на старте, возвращаются на рынок по графику — часто разом. Смотри календарь до даты, а не после. Такой резкий выброс: CLIFF.' },
    brief_smart_wallets: { title: 'Умные кошельки', body: 'Некоторые адреса стабильно заходят рано и стабильно правы. Отслеживать их полезнее, чем цену. Что делать с такими кошельками: FOLLOW.' },
    brief_risk_sizing: { title: 'Размер риска', body: 'Разоряет не та сделка, где ты ошибся, а та, где взял слишком большой объём. Риск — фиксированная малая доля счёта на позицию. Эта дисциплина: SIZING.' },
    brief_exit_plan: { title: 'План выхода', body: 'Входить легко, а деньги решаются на выходе. Знай цель и точку отмены до покупки. Половина, которую все пропускают: EXIT.' },
    brief_narrative_cycle: { title: 'Ротация нарративов', body: 'Внимание переходит между секторами циклами — что вело в прошлом месяце, редко ведёт в этом. Следи, куда приходит поток. Это перемещение между нарративами: ROTATION.' },
    brief_fee_drag: { title: 'Потери на исполнении', body: 'На тонких парах цена исполнения хуже той, что ты видел, и каждый круг платит эту разницу. Мелочь на одной сделке, разорение на сотне. Сама разница: SLIPPAGE.' },
    ladderKicker: 'ЕЖЕДНЕВНЫЕ НАГРАДЫ', ladderTitle: 'Серия входов', ladderDay: (n) => `День ${n}`, ladderToday: 'Сегодня', ladderClaimed: 'Получено', ladderStreakLabel: (n) => `Серия: ${n} дн.`, ladderBest: (n) => `лучшая ${n}`, ladderHint: 'Заходи каждый день — пропуск сбрасывает серию.',
    navTerminal: 'Терминал', terminalKicker: 'ТЕРМИНАЛ XRADAR', terminalTitle: 'Торгуй по сигналам', terminalText: 'Всё, чему ты научился здесь, работает на живом рынке. Подтверждённые сделки возвращают Signal Points в твой сезонный счёт.', terminalOpenCta: 'Открыть терминал ↗', terminalRate: (sp) => `Каждая подтверждённая сделка даёт ${sp} Signal Points плюс процент от объёма.`, terminalUnavailable: 'Терминал пока не подключён к этой сборке.',
    profileDays: (n) => `${n} дн. в игре`, profileGroupActivity: 'АКТИВНОСТЬ', profileGroupSkill: 'ЧТЕНИЕ СИГНАЛОВ', profileGroupPositions: 'ПОЗИЦИИ', profileGroupHabit: 'РЕГУЛЯРНОСТЬ', profileGroupBuild: 'ПОСТРОЙКА СЕТИ', profileTaps: 'Всего сканирований', profileSweepBest: 'Лучший счёт Sweep', profileSweepRounds: 'Раундов Sweep', profileAssessments: 'Верных прогнозов', profileAccuracy: 'Точность за всё время', profileLiveCalls: 'Живых прогнозов', profilePositions: 'Позиций выиграно', profilePositionStreak: 'Лучшая серия позиций', profileSeasonSp: 'Signal Points за сезон', profileStreak: 'Серия входов', profileBriefings: 'Сводок получено', profileReferrals: 'Активных рефералов', profileModuleLevels: 'Суммарно уровней модулей', profileAchievements: 'Достижения', profileGear: 'Снаряжения',
    streak: 'Серия дней', dailyCalls: 'Прогнозы сегодня', signalPoints: 'Signal Points', tapBoostBadge: (mult, left) => `×${mult} БОНУС · осталось ${left}`, season: 'Сезон', nextLeague: 'Следующая лига', topLeague: 'Максимальная лига достигнута',
    scoreNetwork: 'Развитие сети', scoreAccuracy: 'Точность', scoreActivity: 'Активность', scoreXradar: 'XRadar', scoreReferrals: 'Рефералы', scoreSignalPoints: 'Signal Points',
    reportKicker: 'С ВОЗВРАЩЕНИЕМ', reportTitle: 'Scout продолжал сканирование', collect: 'Забрать отчёт', reportText: (hours) => `Сеть работала, пока тебя не было — Интел за ${hours}ч уже собран.`,
    welcomeKicker: 'ДОБРО ПОЖАЛОВАТЬ, ОПЕРАТОР', welcomeTitle: 'Твоя сеть разведки запущена', welcomeBody: 'Тапай по радару, чтобы сканировать рынок и добывать Интел, охоться за живыми сигналами токенов и поднимайся в сезонном рейтинге аирдропа. Каждое сканирование и каждый верный прогноз строят твою историю.', welcomeBullet1: 'Тапай для сканирования — добывай Интел и находи сигналы', welcomeBullet2: 'Читай сигналы — отслеживай или пропускай, ставь на убеждение', welcomeBullet3: 'Поднимайся по лигам — зарабатывай Signal Points к аирдропу', welcomeCta: 'Начать сканирование',
    spinKicker: 'ЕЖЕДНЕВНАЯ НАГРАДА', spinTitle: 'Крути колесо', spinCta: 'Бесплатный спин', spinSpinning: 'Крутим…', spinDone: 'Возвращайся завтра за новым спином.', spinStreakLabel: (n) => `серия ${n} дн.`, spinWon: (r) => `Ты выиграл ${r}!`, spinNextFree: 'Следующий бесплатный спин завтра',
    lootboxKicker: 'СУНДУКИ', lootboxTitle: 'Открой сундуки', lootboxOpen: 'Открыть', lootboxOpening: 'Открываем…', lootboxEmpty: 'Сундуков пока нет — получай их за спины и квесты.', lootboxStandard: 'Обычный сундук', lootboxPremium: 'Премиум сундук', lootboxWon: (r) => `Сундук открыт: ${r}`,
    walletKicker: 'КОШЕЛЁК', walletTitle: 'Подключи кошелёк', walletText: 'Подключи TON-кошелёк, чтобы претендовать на аирдроп и получить разовую награду.', walletConnect: 'Подключить кошелёк', walletConnecting: 'Подключаем…', walletDisconnect: 'Отключить', walletConnectedLabel: 'Кошелёк подключён', walletConnectedReward: (sp, c) => `Кошелёк подключён. +${sp} SP, +${c} чипов.`, walletRequired: 'Обязательно для участия в аирдропе', walletShort: (a) => `${a.slice(0, 6)}…${a.slice(-4)}`, walletError: 'Не удалось подключить кошелёк. Попробуй снова.',
    scoreWallet: 'Кошелёк',
    tabXradar: 'XRadar', tabMarkets: 'Рынки',
    mSortHot: 'Горячие', mSortNew: 'Новые', mSortCap: 'Топ', mCreators: 'Топ создателей',
    mCreateTitle: 'Создай свой рынок', mCreateKicker: 'СОЗДАТЬ',
    mCreateText: (cost, seed) => `Листинг стоит ${cost} Интела плюс стартовая позиция ${seed} долей. Один рынок в неделю.`,
    mTicker: 'Тикер', mName: 'Название', mCreateCta: 'Создать рынок', mCreating: 'Создаём…',
    mCooldown: (h) => `Следующий рынок через ${h} ч`,
    mPrice: 'Цена', mSupply: 'Выпуск', mHolders: 'Держатели', mVolume: 'Оборот', mTraders: 'Трейдеры',
    mBuy: 'Купить', mSell: 'Продать', mRedeem: 'Забрать', mBuying: 'Покупаем…', mSelling: 'Продаём…',
    mYours: (shares) => `У тебя ${shares}`,
    mEnds: (t) => `закрытие через ${t}`, mSettled: 'Закрыт', mEmpty: 'Рынков пока нет — создай первый.',
    mBought: (shares, ticker) => `Куплено ${shares} долей $${ticker}`,
    mSold: (intel) => `Продано за ${intel} Интела`,
    mRedeemed: (intel) => `Забрано ${intel} Интела`,
    mCreated: (ticker) => `$${ticker} торгуется`,
    mIntelAmount: 'Сколько Интела', mShareAmount: 'Сколько долей',
    mMineTitle: 'Твои рынки', mSeasonSp: (used, cap) => `${used} / ${cap} SP с рынков за сезон`,
    mRule: 'Signal Points начисляются за уникальных трейдеров, которых привлёк твой рынок — никогда за прибыль.',
    mCurve: (base, slope) => `цена = ${base} + ${slope} × выпуск`,
    mBurn: (pct) => `${pct}% сгорает с каждой сделки`,
    shopKicker: 'МАГАЗИН СТАНЦИИ', shopTitle: 'Бусты и пропуска', shopStars: 'Stars', shopTon: 'TON', shopBuy: 'Купить', shopBusy: 'Открываем…', shopPaid: 'Покупка завершена.', shopPending: 'Ждём подтверждения платежа…', shopUnavailable: 'Платежи сейчас недоступны.', shopVerify: 'Я оплатил', shopVerifying: 'Проверяем блокчейн…',
    product_energy_refill: 'Полный резерв энергии', product_parts_pack: '20 деталей', product_instant_finish: 'Мгновенное завершение', product_operator_pass: 'Operator Pass · 30 дней', product_cosmetic_station_pack: 'Косметический набор станции',
    product_energy_refill_desc: 'Заполнить энергию станции до максимума.', product_parts_pack_desc: 'Защищённая поставка деталей для апгрейдов.', product_instant_finish_desc: 'Мгновенно завершить одну активную операцию.', product_operator_pass_desc: 'Расширенный склад, второй слот стройки и ежедневные детали.', product_cosmetic_station_pack_desc: 'Открывает альтернативный неон, полы и костюмы оператора.',
    resourceIntel: 'Интел нужен для улучшения модулей. Он добывается сканированием и пассивной работой сети.', resourceEnergy: 'Энергия расходуется на сканирование. Энергоячейка увеличивает запас и восстановление.', resourceChips: 'Чипы — редкий материал для улучшений. Их дают сигналы, ежедневные задания и активные рефералы.',
    copied: 'Реферальный код скопирован.', connected: 'Реферал подключён.', languageSaved: 'Язык изменён.', notConfigured: 'Подключи XRADAR_BASE_URL, чтобы открыть полный анализ.', shareText: 'Присоединяйся к моей сети крипторазведки XRadar.',
    revealTitle: 'СИГНАЛ РАССЕКРЕЧЕН', revealLive: 'Живой токен из ленты XRadar', revealSince: 'движение после сигнала XRadar', revealHour: 'движение за последний час', revealScore: 'Оценка XRadar', revealOpen: 'Следить в XRadar ↗', revealShare: 'Поделиться прогнозом',
    revealShareText: (symbol, move, correct) => `${correct ? 'Угадал' : 'Не угадал'}: $${symbol} сделал ${move} в живой ленте XRadar. Прочитаешь сигнал раньше рынка?`,
    achTitle: 'ДОСТИЖЕНИЯ', achEarned: 'получено', achLocked: 'Закрыто', achUnlocked: 'ДОСТИЖЕНИЕ ОТКРЫТО', achReward: 'Награда', achGear: 'Открыто снаряжение', achClose: 'Продолжить',
    gearTitle: 'СНАРЯЖЕНИЕ ОПЕРАТОРА', gearEquip: 'Надеть', gearEquipped: 'Надето', gearSlotBody: 'Корпус', gearSlotTool: 'Инструмент', gearSlotHead: 'Голова', gearNone: 'Пока ничего не найдено.',
    posTitle: 'УБЕЖДЁННОСТЬ', posHelp: 'Поставь Интел и выбери, сколько держать. Исход — реальное движение реального токена.', posStake: 'Ставка', posHorizon: 'Горизонт', posOpen: 'ОТКРЫТЬ ПОЗИЦИЮ', posIgnore: 'ПРОПУСТИТЬ',
    posOpened: 'Позиция открыта. Возвращайся, когда раскроется.', posOpenTitle: 'ОТКРЫТЫЕ ПОЗИЦИИ', posReady: 'Готова к раскрытию', posSettle: 'Раскрыть', posSettling: 'Раскрываем…', posStaked: 'ставка', posNoLive: 'Живые сигналы недоступны — лента радара ещё прогревается.',
    posRecord: 'ТРЕК-РЕКОРД', posWinRate: 'Винрейт', posRealized: 'Реализовано', posStreak: 'Серия', posBest: 'Лучший колл', posSettled: 'Позиций закрыто', posResult: 'Позиция закрыта', posReturned: 'Возврат', posProfit: 'Прибыль', posLoss: 'Убыток',
    convKicker: 'ТЕРМИНАЛ XRADAR', convTitle: 'Торгуй тем, что оценил', convText: 'Перенеси свои прогнозы в живой терминал. Сделай первую сделку в XRadar и забери бонус оператора.', convOpen: 'Открыть XRadar ↗', convClaim: 'Забрать +10 ◆', convClaimed: 'Бонус оператора получен', convVerified: 'Сделка подтверждена. +10 чипов начислено.', convNotVerified: 'Подтверждённой сделки на твоём аккаунте XRadar пока нет.',
    tradeLadderTitle: 'Торговый ранг', tradeLadderText: 'Твоя реальная торговля, подтверждённая XRadar, приносит Signal Points и повышает торговый ранг.', tradeSync: 'Синхронизировать', tradeSynced: (sp) => sp > 0 ? `+${sp} Signal Points за сделки в XRadar.` : 'Новых подтверждённых сделок с прошлой синхронизации нет.', tradeNotVerified: 'Подключись и торгуй в XRadar, чтобы начать зарабатывать. Аккаунт пока не подтверждён.', tradeUnavailable: 'Синхронизация торговли сейчас недоступна.', tradeVolume: 'Подтв. объём', tradeCount: 'Подтв. сделок', tradeEarned: 'SP с торговли', tradeRankNext: (rank, vol) => `Далее: ${rank} на $${vol}`, tradeRankMax: 'Максимальный торговый ранг',
    rankUnranked: 'Без ранга', rankRookie: 'Rookie', rankTrader: 'Trader', rankSharp: 'Sharp', rankWhale: 'Whale',
    observer: 'Наблюдатель', scout: 'Разведчик', analyst: 'Аналитик', hunter: 'Охотник за сигналами', detective: 'Рыночный детектив', operator: 'Альфа-оператор', oracle: 'Оракул'
  }
};

Object.assign(I18N.en, {
  authKicker: 'XRADAR SIGNAL INTELLIGENCE',
  authTitle: 'See the market before it moves.',
  authText: 'Detect anomalies, develop your intelligence stack and turn verified market behavior into an edge.',
  enter: 'Access the network',
  scan: 'PULSE',
  networkOnline: 'LIVE INTELLIGENCE',
  signalsDetected: 'SIGNAL QUEUE',
  liveMarket: 'LIVE MARKET',
  globalSignalMap: 'GLOBAL SIGNAL MAP',
  nextSignal: 'NEXT SIGNAL',
  pulses: 'pulses',
  liveFeed: 'LIVE FEED',
  marketQuiet: 'Awaiting market telemetry',
  price: 'Price',
  volume24h: '24h volume',
  marketCap: 'Market cap',
  holders: 'Holders',
  tokenAge: 'Token age',
  hoursShort: 'h',
  encrypted: 'Encrypted',
  signalActionHelp: 'Review the complete market structure before choosing an action. Your accuracy affects league progress and airdrop score.',
  onboardingProgress: 'NETWORK SETUP',
  setup0Title: 'Restore emergency power',
  setup0Text: 'Bring the intelligence deck online and unlock the first systems.',
  setup1Title: 'Initialize Radar Core',
  setup1Text: 'Connect the terminal and calibrate the market scanner.',
  setup2Title: 'Assess the first signal',
  setup2Text: 'Read the evidence and make your first verified market call.',
  setup3Title: 'Stabilize the energy grid',
  setup3Text: 'Restore the power reserve required for continuous scanning.',
  setup4Title: 'Install the Power Cell',
  setup4Text: 'Complete the network setup and unlock persistent progression.',
  reportTitle: 'Your network stayed active',
  buildHypothesis: 'BUILD YOUR HYPOTHESIS',
  factorsMarked: 'factors marked',
  chooseEvidence: 'Mark at least one evidence factor before submitting your thesis.',
  factorThin: 'Thin liquidity',
  factorThinText: 'Pool depth may not support a safe exit.',
  factorConcentration: 'Holder concentration',
  factorConcentrationText: 'A small wallet group controls too much supply.',
  factorMutable: 'Mutable contract',
  factorMutableText: 'Critical contract permissions are still active.',
  factorActivity: 'Abnormal activity',
  factorActivityText: 'Transaction pressure is outside its normal range.',
  factorClear: 'No critical flags',
  factorClearText: 'Visible market structure appears balanced.',
  outcomeReport: 'ANALYSIS REPORT',
  thesisConfirmed: 'Thesis confirmed',
  thesisRevised: 'Thesis needs revision',
  evidenceScore: 'Evidence score',
  riskScore: 'Calculated risk',
  relevantEvidence: 'Relevant evidence',
  unsupportedEvidence: 'Unsupported assumptions',
  rewardEarned: 'Reward earned',
  insightBonus: 'insight bonus',
  dailyBrief: "TODAY'S COMMAND BRIEF",
  briefProgress: 'Daily completion',
  scanTarget: 'Run 100 market pulses',
  assessTarget: 'Assess 5 signals',
  comboTarget: 'Solve Module Combo',
  cipherTarget: 'Decode Signal Cipher',
  daysLeft: 'days left',
  continue: 'Continue',
  scanHint: 'TAP · 1 ENERGY',
  marketEvent: 'MARKET EVENT',
  eventAlert: 'LIVE MARKET ANOMALY',
  eventChoose: 'Choose a countermeasure. Every response has a different cost and reward.',
  energyCost: 'Energy cost',
  eventResolved: 'Market event contained.',
  newSignalFound: 'New signal discovered:',
  loginStreak: 'LOGIN STREAK',
  streakDays: 'consecutive days',
  nextReward: 'Next reward',
  dayShort: 'D',
  cipherHint: 'Community hint'
});

Object.assign(I18N.ru, {
  authKicker: 'СИГНАЛЬНАЯ РАЗВЕДКА XRADAR',
  authTitle: 'Увидь движение рынка до того, как оно начнётся.',
  authText: 'Находи аномалии, развивай аналитическую систему и превращай подтверждённые данные рынка в преимущество.',
  enter: 'Войти в систему',
  scan: 'ИМПУЛЬС',
  networkOnline: 'РАЗВЕДКА АКТИВНА',
  signalsDetected: 'ОЧЕРЕДЬ СИГНАЛОВ',
  liveMarket: 'РЫНОК ОНЛАЙН',
  globalSignalMap: 'ГЛОБАЛЬНАЯ КАРТА',
  nextSignal: 'СЛЕДУЮЩИЙ СИГНАЛ',
  pulses: 'импульсов',
  liveFeed: 'ЖИВОЙ ПОТОК',
  marketQuiet: 'Ожидание рыночной телеметрии',
  price: 'Цена',
  volume24h: 'Объём за 24ч',
  marketCap: 'Капитализация',
  holders: 'Холдеры',
  tokenAge: 'Возраст токена',
  hoursShort: 'ч',
  encrypted: 'Зашифровано',
  signalActionHelp: 'Изучи структуру рынка перед решением. Точность влияет на лигу и рейтинг airdrop.',
  onboardingProgress: 'НАСТРОЙКА СЕТИ',
  setup0Title: 'Восстанови аварийное питание',
  setup0Text: 'Запусти аналитический контур и открой первые системы.',
  setup1Title: 'Инициализируй ядро радара',
  setup1Text: 'Подключи терминал и откалибруй рыночный сканер.',
  setup2Title: 'Оцени первый сигнал',
  setup2Text: 'Изучи данные и сделай первый проверяемый рыночный прогноз.',
  setup3Title: 'Стабилизируй энергосистему',
  setup3Text: 'Восстанови запас энергии для непрерывного сканирования.',
  setup4Title: 'Установи энергоячейку',
  setup4Text: 'Заверши настройку сети и открой постоянное развитие.',
  reportTitle: 'Сеть продолжала работать',
  buildHypothesis: 'СОБЕРИ АНАЛИТИЧЕСКУЮ ГИПОТЕЗУ',
  factorsMarked: 'факторов отмечено',
  chooseEvidence: 'Перед решением отметь хотя бы один фактор.',
  factorThin: 'Низкая ликвидность',
  factorThinText: 'Глубины пула может не хватить для безопасного выхода.',
  factorConcentration: 'Концентрация холдеров',
  factorConcentrationText: 'Небольшая группа кошельков контролирует слишком много.',
  factorMutable: 'Изменяемый контракт',
  factorMutableText: 'Критические разрешения контракта остаются активными.',
  factorActivity: 'Аномальная активность',
  factorActivityText: 'Давление транзакций вышло за обычный диапазон.',
  factorClear: 'Критических флагов нет',
  factorClearText: 'Видимая структура рынка выглядит сбалансированной.',
  outcomeReport: 'ОТЧЁТ АНАЛИЗА',
  thesisConfirmed: 'Гипотеза подтверждена',
  thesisRevised: 'Гипотезу нужно пересмотреть',
  evidenceScore: 'Качество аргументов',
  riskScore: 'Расчётный риск',
  relevantEvidence: 'Значимые факторы',
  unsupportedEvidence: 'Неподтверждённые предположения',
  rewardEarned: 'Полученная награда',
  insightBonus: 'бонус за анализ',
  dailyBrief: 'ОПЕРАЦИОННЫЙ ПЛАН НА СЕГОДНЯ',
  briefProgress: 'Дневной прогресс',
  scanTarget: 'Выполнить 100 импульсов',
  assessTarget: 'Оценить 5 сигналов',
  comboTarget: 'Решить комбо модулей',
  cipherTarget: 'Расшифровать код сигнала',
  daysLeft: 'дней осталось',
  continue: 'Продолжить',
  scanHint: 'НАЖИМАЙ · 1 ЭНЕРГИЯ',
  marketEvent: 'РЫНОЧНОЕ СОБЫТИЕ',
  eventAlert: 'РЫНОЧНАЯ АНОМАЛИЯ',
  eventChoose: 'Выбери контрмеру. У каждого решения своя цена и награда.',
  energyCost: 'Расход энергии',
  eventResolved: 'Рыночное событие устранено.',
  newSignalFound: 'Обнаружен новый сигнал:',
  loginStreak: 'СЕРИЯ ВХОДОВ',
  streakDays: 'дней подряд',
  nextReward: 'Следующая награда',
  dayShort: 'Д',
  cipherHint: 'Подсказка сообщества'
});

Object.assign(I18N.en, {
  genesisKicker: '24H GENESIS SIGNAL HUNT',
  genesisTitle: '1,000 founding operators',
  genesisClaimed: number => `GENESIS OPERATOR #${number}`,
  genesisPending: 'Complete 25 pulses and assess one signal to claim a permanent Genesis number.',
  genesisClosed: 'The first 1,000 Genesis positions have been claimed. Your intelligence record still counts.',
  genesisProgress: 'Genesis network progress',
  pulsesRequired: '25 market pulses',
  assessmentRequired: '1 signal assessment',
  spotsRemaining: 'spots remaining',
  activated: 'active',
  shareResult: 'Challenge the network',
  shareStory: 'Share to Story',
  sharingUnavailable: 'Telegram sharing will activate after TELEGRAM_BOT_USERNAME is configured.',
  leaderboardTitle: 'LIVE LEADERBOARDS',
  intelligenceRank: 'Intelligence ranking',
  recruiterRank: 'Top recruiters',
  genesisGrowth: 'GENESIS GROWTH',
  callsShort: 'calls',
  noRankings: 'No verified operators yet. Be the first.',
  referralsShort: 'qualified',
  scoreShort: 'score',
  genesisModalTitle: 'Genesis status confirmed',
  genesisModalText: number => `You are XRadar Genesis Operator #${number}. Your verified intelligence record is now live.`,
  genesisShareText: (number, score) => `I qualified as XRadar Genesis Operator #${number}. Intelligence score: ${score}. Can you see the signal before the market?`,
  genesisPendingShareText: score => `My XRadar intelligence score is ${score}. Can you see the signal before the market?`,
  shareBonusLine: (intel, chips) => `Open on my link and the network fronts you ${intel} Intel and ${chips} chips to start with.`
});

Object.assign(I18N.ru, {
  genesisKicker: '24-ЧАСОВАЯ GENESIS-ОХОТА',
  genesisTitle: '1 000 первых операторов',
  genesisClaimed: number => `GENESIS-ОПЕРАТОР #${number}`,
  genesisPending: 'Выполни 25 импульсов и оцени один сигнал, чтобы получить постоянный Genesis-номер.',
  genesisClosed: 'Первые 1 000 Genesis-позиций уже заняты. Твой подтверждённый результат всё равно учитывается.',
  genesisProgress: 'Прогресс Genesis-сети',
  pulsesRequired: '25 рыночных импульсов',
  assessmentRequired: '1 оценка сигнала',
  spotsRemaining: 'мест осталось',
  activated: 'активно',
  shareResult: 'Бросить вызов',
  shareStory: 'В историю',
  sharingUnavailable: 'Telegram-шаринг включится после настройки TELEGRAM_BOT_USERNAME.',
  leaderboardTitle: 'ЖИВЫЕ РЕЙТИНГИ',
  intelligenceRank: 'Рейтинг аналитиков',
  recruiterRank: 'Лучшие рекрутеры',
  genesisGrowth: 'РОСТ GENESIS',
  callsShort: 'прогнозов',
  noRankings: 'Подтверждённых операторов пока нет. Стань первым.',
  referralsShort: 'активных',
  scoreShort: 'счёт',
  genesisModalTitle: 'Genesis-статус подтверждён',
  genesisModalText: number => `Ты стал Genesis-оператором XRadar #${number}. Твой подтверждённый результат уже в сети.`,
  genesisShareText: (number, score) => `Я стал Genesis-оператором XRadar #${number}. Intelligence Score: ${score}. Увидишь сигнал раньше рынка?`,
  genesisPendingShareText: score => `Мой Intelligence Score в XRadar: ${score}. Увидишь сигнал раньше рынка?`,
  shareBonusLine: (intel, chips) => `Зайдёшь по моей ссылке — сеть выдаст тебе на старт ${intel} Интела и ${chips} чипа.`
});

const MODULES = {
  lab: { icon: '◎', color: '#3ce3ff', en: ['Radar Core', 'Powers every active scan and sets the base Intel yield.'], ru: ['Ядро радара', 'Усиливает каждое сканирование и базовую добычу Интела.'] },
  power: { icon: 'ϟ', color: '#ffb84d', en: ['Power Cell', 'Expands Energy capacity and speeds up regeneration.'], ru: ['Энергоячейка', 'Увеличивает запас Энергии и ускоряет восстановление.'] },
  workshop: { icon: '◆', color: '#9c87ff', en: ['Chip Forge', 'Extends offline storage and improves rare hardware drops.'], ru: ['Фабрика чипов', 'Расширяет офлайн-хранилище и добычу редких деталей.'] },
  comms: { icon: '⌁', color: '#60b9ff', en: ['Market Feed', 'Boosts network income and scan power.'], ru: ['Рыночный поток', 'Увеличивает доход сети и мощность сканирования.'] },
  automation: { icon: '∞', color: '#65f3ae', en: ['Auto Scan', 'Keeps part of the network running while you are away.'], ru: ['Автосканер', 'Поддерживает работу сети, пока тебя нет в игре.'] },
  antenna: { icon: '↗', color: '#ff779c', en: ['Whale Tracker', 'Unlocks stronger signals and smart-wallet activity.'], ru: ['Трекер китов', 'Открывает сильные сигналы и активность смарт-кошельков.'] },
  analysis: { icon: '△', color: '#b39cff', en: ['Risk Decoder', 'Reveals more evidence before a market decision.'], ru: ['Декодер риска', 'Показывает больше данных перед решением по сигналу.'] },
  interceptor: { icon: '✦', color: '#ffd166', en: ['Alpha Interceptor', 'Captures rare anomalies and premium signal rewards.'], ru: ['Альфа-перехватчик', 'Ловит редкие аномалии и премиальные награды.'] }
};

// Display names for Daily Combo signal cards, keyed to COMBO_CARD_DEFS on the
// server. The icon/tier come from the server library in game state; only the
// localized label lives here. Unknown keys fall back to a humanized key so a
// new server card never renders blank on an old client.
const COMBO_CARDS = {
  smart_money:         { en: 'Smart Money',        ru: 'Умные деньги' },
  liquidity_pool:      { en: 'Liquidity Pool',     ru: 'Пул ликвидности' },
  volume_spike:        { en: 'Volume Spike',       ru: 'Всплеск объёма' },
  buy_pressure:        { en: 'Buy Pressure',       ru: 'Давление покупок' },
  holder_growth:       { en: 'Holder Growth',      ru: 'Рост холдеров' },
  dev_lock:            { en: 'Dev Lock',           ru: 'Блок разработчика' },
  mint_revoked:        { en: 'Mint Revoked',       ru: 'Минт отозван' },
  rug_shield:          { en: 'Rug Shield',         ru: 'Защита от рага' },
  honeypot_scan:       { en: 'Honeypot Scan',      ru: 'Скан ханипота' },
  top10_concentration: { en: 'Top-10 Holders',     ru: 'Топ-10 холдеров' },
  bonding_curve:       { en: 'Bonding Curve',      ru: 'Бондинг-кривая' },
  dex_migration:       { en: 'DEX Migration',      ru: 'Миграция на DEX' },
  market_cap:          { en: 'Market Cap',         ru: 'Капитализация' },
  fresh_launch:        { en: 'Fresh Launch',       ru: 'Новый запуск' },
  paid_boost:          { en: 'Paid Boost',         ru: 'Платный буст' },
  whale_alert:         { en: 'Whale Alert',        ru: 'Кит-алерт' },
  insider_flow:        { en: 'Insider Flow',       ru: 'Поток инсайдеров' },
  copy_trade:          { en: 'Copy Trade',         ru: 'Копитрейд' },
  sniper_bot:          { en: 'Sniper Bot',         ru: 'Снайпер-бот' },
  arena_signal:        { en: 'Arena Signal',       ru: 'Сигнал арены' },
  proof_of_alpha:      { en: 'Proof of Alpha',     ru: 'Proof of Alpha' },
  radar_score:         { en: 'Radar Score',        ru: 'Скор радара' },
  momentum_shift:      { en: 'Momentum Shift',     ru: 'Сдвиг импульса' },
  organic_growth:      { en: 'Organic Growth',     ru: 'Органический рост' }
};

function comboCardName(key) {
  const card = COMBO_CARDS[String(key)];
  if (card) return card[state.language] || card.en;
  return String(key).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function comboCardIcon(key) {
  const lib = state.game?.gameplay?.combo?.library || [];
  return lib.find(entry => entry.key === key)?.icon || '📡';
}

// Academy lesson content, keyed to ACADEMY_LESSONS on the server. The server
// owns the correct-answer index and the reward; this holds only the localized
// question, options, and the explanation shown after answering. The `answer`
// index here is display-only (to mark the right option) and must match the
// server, which is the actual authority.
const ACADEMY_CONTENT = {
  liquidity: {
    icon: '💧',
    en: { title: 'Liquidity', q: 'What does low liquidity usually mean for a token?', opts: ['It always pumps', 'Price moves hard on small trades', 'It is fully audited'], why: 'Thin liquidity means even small buys or sells swing the price a lot — easy to enter, painful to exit.' },
    ru: { title: 'Ликвидность', q: 'Что обычно означает низкая ликвидность токена?', opts: ['Он всегда растёт', 'Цена сильно двигается от малых сделок', 'Он полностью проверен'], why: 'Тонкая ликвидность значит, что даже малые покупки/продажи сильно двигают цену — легко войти, больно выйти.' }
  },
  rugpull: {
    icon: '🚨',
    en: { title: 'Rug pull', q: 'Which is the biggest rug-pull warning sign?', opts: ['Active community', 'Verified contract', 'Dev holds most of the supply and liquidity is unlocked'], why: 'When the team can drain liquidity or dump a huge share at will, the token can go to zero in seconds.' },
    ru: { title: 'Раг-пул', q: 'Какой признак раг-пула самый тревожный?', opts: ['Активное сообщество', 'Проверенный контракт', 'Разработчик держит большую часть и ликвидность не залочена'], why: 'Когда команда может слить ликвидность или сбросить огромную долю в любой момент — токен уходит в ноль за секунды.' }
  },
  smart_money: {
    icon: '🐋',
    en: { title: 'Smart money', q: 'What is "smart money" in trading?', opts: ['Wallets with a track record of profitable, early entries', 'Any large wallet', 'The project treasury'], why: 'Smart-money wallets have a history of getting in early on winners — following them is a signal, not a guarantee.' },
    ru: { title: 'Умные деньги', q: 'Что такое «умные деньги» в трейдинге?', opts: ['Кошельки с историей прибыльных ранних входов', 'Любой крупный кошелёк', 'Казна проекта'], why: 'Кошельки умных денег имеют историю ранних заходов в победителей — следовать за ними это сигнал, а не гарантия.' }
  },
  bonding_curve: {
    icon: '📊',
    en: { title: 'Bonding curve', q: 'On a bonding curve, what happens as more people buy?', opts: ['Price stays flat', 'Each new buy costs more than the last', 'Supply runs out instantly'], why: 'A bonding curve raises the price with every purchase along the curve, until the token migrates to a DEX.' },
    ru: { title: 'Бондинг-кривая', q: 'Что происходит на бондинг-кривой по мере покупок?', opts: ['Цена стоит на месте', 'Каждая новая покупка дороже предыдущей', 'Предложение мгновенно кончается'], why: 'Бондинг-кривая поднимает цену с каждой покупкой вдоль кривой, пока токен не мигрирует на DEX.' }
  },
  market_cap: {
    icon: '🏦',
    en: { title: 'Market cap', q: 'How is a token\'s market cap calculated?', opts: ['Liquidity × 2', 'Just the 24h volume', 'Price × circulating supply'], why: 'Market cap = price × circulating supply. A low price with a huge supply can still be a large cap.' },
    ru: { title: 'Капитализация', q: 'Как считается капитализация токена?', opts: ['Ликвидность × 2', 'Только объём за 24ч', 'Цена × оборотное предложение'], why: 'Капитализация = цена × оборотное предложение. Низкая цена при огромном предложении всё равно даёт большой кап.' }
  },
  slippage: {
    icon: '🔀',
    en: { title: 'Slippage', q: 'What is slippage?', opts: ['The gap between expected and executed price', 'A type of gas fee', 'A staking reward'], why: 'Slippage is how far your fill drifts from the quoted price — worse on low liquidity and big orders.' },
    ru: { title: 'Проскальзывание', q: 'Что такое проскальзывание (slippage)?', opts: ['Разрыв между ожидаемой и реальной ценой', 'Вид комиссии за газ', 'Награда за стейкинг'], why: 'Проскальзывание — насколько исполнение уходит от котировки; хуже при низкой ликвидности и крупных ордерах.' }
  },
  honeypot: {
    icon: '🍯',
    en: { title: 'Honeypot', q: 'What is a honeypot token?', opts: ['A token with high yield', 'One you can buy but not sell', 'A stablecoin'], why: 'A honeypot lets you buy but blocks selling — the contract traps your funds. Always check sellability.' },
    ru: { title: 'Ханипот', q: 'Что такое токен-ханипот?', opts: ['Токен с высокой доходностью', 'Тот, что можно купить, но нельзя продать', 'Стейблкоин'], why: 'Ханипот позволяет купить, но блокирует продажу — контракт запирает средства. Всегда проверяй возможность продажи.' }
  },
  volume: {
    icon: '📈',
    en: { title: 'Volume', q: 'Why watch trading volume?', opts: ['It sets the token name', 'It is the gas price', 'It shows real interest and how easily you can trade'], why: 'Volume reveals genuine activity — high volume means tighter fills; suspiciously flat or fake volume is a red flag.' },
    ru: { title: 'Объём', q: 'Зачем следить за объёмом торгов?', opts: ['Он задаёт имя токена', 'Это цена газа', 'Он показывает реальный интерес и лёгкость торговли'], why: 'Объём отражает настоящую активность — высокий объём даёт лучшее исполнение; подозрительно ровный или накрученный объём это красный флаг.' }
  }
};

function lessonContent(id) {
  const c = ACADEMY_CONTENT[id];
  if (!c) return null;
  return { icon: c.icon, ...(c[state.language] || c.en) };
}

const state = {
  config: null, game: null, screen: 'radar', language: 'en',
  launch: null, accuracyLeaderboard: [], referralLeaderboard: [], growthBusy: false, growthLoadedAt: 0,
  tribe: null, tribeLeaderboard: [], tribeLoadedAt: 0, tribeBusy: false, tribeFaction: null,
  friends: null, friendsLoadedAt: 0, friendsBusy: false,
  tradeSyncBusy: false, tradeSyncAt: 0,
  selectedCombo: [], pendingScans: 0, scanTimer: null, scanBusy: false,
  scanComboLevel: 0, scanComboTimer: null, spHeroShown: 0,
  farm: null, farmTick: null, farmBusy: false,
  questArmed: {}, questBusy: false, lessonBusy: false,
  spinBusy: false, spinAnimating: false, lootboxBusy: false, walletBusy: false, tonConnect: null, tonUnsub: null,
  catalog: null, catalogBusy: false, shopBusy: null,
  marketData: null, marketCreators: [], marketsBusy: false, marketsAt: 0, marketSort: 'hot',
  marketCreateBusy: false, marketTradeBusy: null, termTab: 'xradar',
  sweep: null,
  pollTimer: null, toastTimer: null, sheet: null, lastFocus: null,
  actionBusy: false, decisionBusy: false, selectedFactors: [], activeSignalId: null,
  lastReveal: null,
  stake: null, horizon: 'm30', settleBusy: false, countdownTimer: null, liveSyncAt: 0, liveSyncBusy: false,
  pendingUnlock: null, unlockQueue: [], shownUnlocks: new Set(),
  referralQueue: [], shownReferralRewards: new Set()
};

// Icons come from the inline sprite in index.html, never from glyph characters:
// ◈ ★ ⬢ render differently on every platform and read as placeholder text.
const icon = (name, cls = 'ico') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;

const t = key => I18N[state.language]?.[key] ?? I18N.en[key] ?? key;
// Counters abbreviate from 1K, the way every big idle clicker shows them —
// a five-figure Intel balance rendered in full is a wall of digits. Compact
// notation with one fraction digit gives "12.4K" / "3.1M" / "1.2B"; anything
// under 1,000 stays exact so early progress still reads tap-by-tap.
const fmt = value => new Intl.NumberFormat(state.language === 'ru' ? 'ru-RU' : 'en-US', {
  maximumFractionDigits: Math.abs(Number(value) || 0) >= 1_000 ? 1 : 0,
  notation: Math.abs(Number(value) || 0) >= 1_000 ? 'compact' : 'standard'
}).format(Number(value) || 0);
const pct = value => `${Math.round(Number(value) || 0)}%`;
const money = (value, compact = true) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return t('encrypted');
  if (number > 0 && number < 0.01) return `$${number.toFixed(6).replace(/0+$/, '')}`;
  return new Intl.NumberFormat(state.language === 'ru' ? 'ru-RU' : 'en-US', { style:'currency', currency:'USD', maximumFractionDigits:number < 1 ? 4 : 0, notation:compact && number >= 10_000 ? 'compact' : 'standard' }).format(number);
};
const signedPct = value => {
  const number = Number(value);
  return Number.isFinite(number) ? `${number > 0 ? '+' : ''}${number.toFixed(1)}%` : '—';
};
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);
const duration = ms => {
  const seconds = Math.max(0, Math.ceil(Number(ms || 0) / 1000));
  if (seconds >= 3600) return `${Math.floor(seconds / 3600)}h ${Math.floor(seconds % 3600 / 60)}m`;
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'include',
    ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) },
    body: options.body && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || payload.error || 'Network operation failed.');
    error.code = payload.error;
    throw error;
  }
  return payload;
}

function haptic(type = 'light') {
  // Pair a synthesised cue with the notification-class haptics. Impact-class
  // types (light/medium/heavy/rigid/soft) already get their own sound at the
  // call site (the scan click), so they're intentionally left silent here to
  // avoid doubling up on every tap.
  if (type === 'success') feel.reward();
  else if (type === 'error') feel.error();
  try {
    if (!tg?.isVersionAtLeast?.('6.1')) return;
    if (['success','warning','error'].includes(type)) tg.HapticFeedback?.notificationOccurred(type);
    else if (type === 'select') tg.HapticFeedback?.selectionChanged();
    else tg.HapticFeedback?.impactOccurred(type);
  } catch {}
}

function notify(message, error = false) {
  clearTimeout(state.toastTimer);
  const toast = $('toast');
  toast.textContent = message;
  toast.classList.toggle('error', error);
  toast.classList.add('show');
  state.toastTimer = setTimeout(() => toast.classList.remove('show'), error ? 4200 : 2600);
}

function applyLanguage() {
  document.documentElement.lang = state.language;
  document.querySelectorAll('[data-i18n]').forEach(node => {
    const value = t(node.dataset.i18n);
    if (typeof value === 'string') node.textContent = value;
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(node => node.placeholder = t(node.dataset.i18nPlaceholder));
  document.querySelectorAll('[data-language]').forEach(button => button.classList.toggle('active', button.dataset.language === state.language));
}

function moduleCopy(id) {
  const module = MODULES[id];
  const copy = module?.[state.language] || module?.en || [id, ''];
  return { ...module, name: copy[0], description: copy[1] };
}

function leagueName(id) { return t(id || 'observer'); }

function taskView(task) {
  if (!task) return { title: t('launchSequence'), description: t('completeSetup') };
  if (String(task.id).startsWith('build_')) {
    const id = String(task.id).slice(6);
    return { title: `${t('taskUpgrade')}: ${moduleCopy(id).name}`, description: moduleCopy(id).description };
  }
  if (task.id === 'recon') return { title: t('taskSignal'), description: t('signalText') };
  if (task.id === 'supply') return { title: t('taskSupply'), description: t('resourceChips') };
  if (task.id === 'terminal_sync') return { title: t('taskCalibrate'), description: t('resourceIntel') };
  return { title: task.title || t('launchSequence'), description: task.description || t('completeSetup') };
}

function onboardingTaskView(onboarding) {
  const step = Math.max(0, Math.min(4, Number(onboarding?.step || 0)));
  return { title:t(`setup${step}Title`), description:t(`setup${step}Text`), step };
}

function setGame(game) {
  state.game = game;
  state.language = game.profile?.language || state.language || 'en';
  applyLanguage();
  renderAll();
  schedulePoll();
}

function renderAll() {
  if (!state.game) return;
  renderHud();
  renderRadar();
  renderUpgrades();
  renderSignals();
  renderMissions();
  renderAchievements();
  renderGear();
  renderNetwork();
  renderTerminal();
  renderProfile();
  renderWelcome();
  renderReturnReport();
  renderGenesisClaim();
  renderAchievementUnlock();
  renderReferralReward();
}

function renderHud() {
  const game = state.game;
  const optimisticIntel = state.pendingScans * (game.gameplay?.scan?.tapPower || 1);
  $('intelValue').textContent = fmt(game.resources.data + optimisticIntel);
  $('energyValue').textContent = `${fmt(Math.max(0, game.resources.energy - state.pendingScans))}/${fmt(game.resources.energyMax)}`;
  $('chipsValue').textContent = fmt(game.resources.components);
  const league = game.gameplay?.league || { id: 'observer' };
  $('leagueName').textContent = leagueName(league.id);
  $('leagueMark').textContent = leagueName(league.id).slice(0, 1).toUpperCase();
  renderTapHead();
}

// The clean Hamster tap header: resource pills, the big Signal Points balance,
// and the energy bar. Everything else that used to crowd this screen now lives
// on the Missions tab.
function renderTapHead() {
  const game = state.game;
  if (!game) return;
  const optimisticIntel = state.pendingScans * (game.gameplay?.scan?.tapPower || 1);
  const league = game.gameplay?.league || { id: 'observer' };
  const setText = (id, value) => { const el = $(id); if (el) el.textContent = value; };
  setText('tapHeadIntel', fmt(game.resources.data + optimisticIntel));
  setText('tapHeadChips', fmt(game.resources.components));
  setText('tapHeadLeagueName', leagueName(league.id));
  // The hero balance shows Signal Points — the season currency the airdrop pays
  // out on, which is what the player is really accumulating by tapping.
  const sp = Number(game.gameplay?.airdrop?.signalPoints ?? game.progression?.season?.signalPoints ?? 0);
  setText('tapBalanceValue', fmt(sp));
  const energyNow = Math.max(0, game.resources.energy - state.pendingScans);
  const energyMax = Math.max(1, game.resources.energyMax);
  setText('tapEnergyValue', `${fmt(energyNow)}/${fmt(energyMax)}`);
  setText('tapProfitHour', `${fmt(game.resources.productionPerHour)} ${t('income')}`);
  const bar = $('tapEnergyBar'); if (bar) bar.style.width = `${Math.max(0, Math.min(100, energyNow / energyMax * 100))}%`;
  // First-session boost badge: shows the multiplier and taps remaining so the
  // opening burst feels like a limited, urgent bonus — the "earn while you can"
  // pressure Blum opens with.
  const boostLeft = Math.max(0, Number(game.gameplay?.scan?.boostTapsLeft || 0) - state.pendingScans);
  const badge = $('tapBoostBadge');
  if (badge) {
    if (boostLeft > 0) {
      badge.textContent = t('tapBoostBadge')(Number(game.gameplay?.scan?.boostMultiplier || 1), boostLeft);
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }
}

function renderRadar() {
  const game = state.game;
  const scan = game.gameplay?.scan || { tapPower: 1 };
  $('tapPower').textContent = `+${scan.tapPower}`;
  $('profitHour').textContent = `${fmt(game.resources.productionPerHour)} ${t('income')}`;
  const signals = game.progression?.recon?.unlocked ? (game.progression?.recon?.signals || []) : [];
  $('signalCount').textContent = `${signals.length} ${t('waiting')}`;
  $('signalBadge').textContent = signals.length;
  $('signalBadge').classList.toggle('hidden', !signals.length);
  const positions = [[22,28],[72,24],[34,66],[76,61],[49,19],[17,57],[63,75],[84,42]];
  $('signalBlips').innerHTML = signals.slice(0, 8).map((signal, index) => `<button class="signal-blip ${Number(signal.smartWallets || 0) > 2 ? 'rare' : ''}" style="left:${positions[index][0]}%;top:${positions[index][1]}%;animation-delay:${index * .17}s" data-signal="${esc(signal.id)}" type="button" aria-label="${esc(signal.name)}"></button>`).join('');
  const combo = game.gameplay?.combo;
  $('comboState').textContent = combo?.claimed ? t('completed') : t('ready');
  const sweep = game.gameplay?.sweep;
  $('sweepState').textContent = sweep?.canPlay ? t('ready') : t('sweepNoEnergyShort');
  $('airdropScore').textContent = `${fmt(game.gameplay?.airdrop?.total)} pts`;
  renderSpHero(game);
  renderStreakBadge(game);
  renderFarm(game);
  $('scanButton').disabled = Math.floor(game.resources.energy) - state.pendingScans < 1;
  renderScanProgress();
  renderMarketTape(signals);
  renderMarketEvent();
  renderStoryAction();
}

// The Signal Points hero counter — the one dominant number the home screen is
// built around, the way Blum centres its points. New points roll up with a
// count-up tween and the number bumps, so earning always feels like something.
function renderSpHero(game) {  const el = $('spHeroValue');
  if (!el) return;
  const target = Math.max(0, Number(game.gameplay?.airdrop?.signalPoints ?? game.progression?.season?.signalPoints ?? 0));
  const from = Number(state.spHeroShown || 0);
  if (from === target) { el.textContent = fmt(target); return; }
  tweenCount(el, from, target, 600);
  if (target > from) {
    const host = $('spHero');
    host.classList.remove('bump'); void host.offsetWidth; host.classList.add('bump');
  }
  state.spHeroShown = target;
}

function tweenCount(el, from, to, duration) {
  const start = performance.now();
  const step = now => {
    const p = Math.min(1, (now - start) / duration);
    // easeOutCubic for a quick settle.
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = fmt(Math.round(from + (to - from) * eased));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// Always-on daily streak badge. A visible, growing number the player doesn't
// want to lose is a stronger return hook than a reward buried in a menu — the
// same pattern Blum and Hamster put on their home screen. Milestone days
// (multiples of 7) get an emphasized state.
function renderStreakBadge(game) {
  const badge = $('streakBadge');
  if (!badge) return;
  const days = Math.max(0, Number(game.progression?.streak?.current || 0));
  badge.classList.toggle('hidden', days < 1);
  $('streakBadgeDays').textContent = fmt(days);
  badge.classList.toggle('milestone', days > 0 && days % 7 === 0);
  // The market-event chip shares the top-right corner; when it's up, drop the
  // badge below it so they stack instead of overlapping.
  const incidents = game.progression?.incidents;
  const eventVisible = Boolean(game.progression?.onboarding?.completed && (incidents?.active || incidents?.ready));
  badge.classList.toggle('shifted', eventVisible);
  badge.setAttribute('aria-label', `${t('loginStreak')}: ${days} ${t('streakDays')}`);
}

/* ── Signal Farm — Blum-style claim ─────────────────────────────────────────
 * Intel fills a buffer over time; the player taps Collect to bank it and
 * restart the timer. The pending amount is deterministic from startedAt, so the
 * client counts it up live without the server — the claim reconciles on tap.
 */
function renderFarm(game) {
  const card = $('farmCard');
  if (!card) return;
  const farm = game.gameplay?.farm;
  if (!farm) { card.classList.add('hidden'); return; }
  card.classList.remove('hidden');
  state.farm = { startedAt: farm.startedAt ? new Date(farm.startedAt).getTime() : Date.now(), ratePerHour: farm.ratePerHour, capacity: farm.capacity };
  paintFarm();
  startFarmTick();
}

// Compute the live pending value from startedAt/rate/capacity — the same
// formula the server uses, so the displayed number matches the eventual claim.
function farmPendingNow() {
  const f = state.farm;
  if (!f) return { pending: 0, capacity: 0, full: false };
  const elapsedMs = Math.max(0, Date.now() - f.startedAt);
  const pending = Math.min(f.capacity, Math.floor(f.ratePerHour * elapsedMs / 3_600_000));
  return { pending, capacity: f.capacity, full: pending >= f.capacity };
}

function paintFarm() {
  const { pending, capacity, full } = farmPendingNow();
  $('farmAmount').textContent = fmt(pending);
  $('farmBar').style.width = `${capacity ? Math.min(100, (pending / capacity) * 100) : 0}%`;
  const btn = $('farmClaim');
  btn.disabled = pending < 1;
  $('farmCard').classList.toggle('full', full);
  $('farmMeta').textContent = full ? t('farmFull') : t('farmRate')(fmt(state.farm?.ratePerHour || 0));
}

function startFarmTick() {
  clearInterval(state.farmTick);
  // Repaint once a second while the radar screen is showing; cheap and keeps
  // the buffer visibly climbing, which is the whole appeal.
  state.farmTick = setInterval(() => {
    if (state.screen !== 'radar') { clearInterval(state.farmTick); return; }
    paintFarm();
  }, 1000);
}

async function claimFarm() {
  if (state.farmBusy) return;
  const { pending } = farmPendingNow();
  if (pending < 1) { notify(t('farmEmpty'), true); return; }
  state.farmBusy = true;
  $('farmClaim').disabled = true;
  try {
    const response = await api('/api/game/farm/claim', { method:'POST', body:{} });
    setGame(response.game);
    const claimed = Number(response.result?.claimed || 0);
    notify(t('farmCollected')(fmt(claimed)));
    haptic('success');
    // A little burst of intel numbers for the collect payoff.
    for (let i = 0; i < 3; i += 1) setTimeout(() => spawnTapFx(), i * 90);
  } catch (error) {
    notify(error.code === 'FARM_EMPTY' ? t('farmEmpty') : error.message, true);
    haptic('error');
  } finally { state.farmBusy = false; }
}

function renderScanProgress() {
  const scan = state.game.gameplay?.scan || { taps:0 };
  const taps = Math.max(0, Number(scan.taps || 0) + state.pendingScans);
  const milestone = taps % 25;
  const progress = milestone / 25;
  $('scanProgressText').textContent = `${milestone} / 25 ${t('pulses')}`;
  $('scanProgressBar').style.width = `${Math.round(progress * 100)}%`;
  $('scanProgressReward').textContent = Math.floor(taps / 25) < 10 ? '+1 SP' : t('nextSignal');
  $('scanButton').style.setProperty('--scan-progress', `${progress * 360}deg`);
}

function renderMarketTape(signals) {
  const tape = $('marketTape');
  if (!signals.length) {
    tape.innerHTML = `<div class="market-tape-empty"><span class="live-dot"></span><small>${t('liveFeed')}</small><b>${t('marketQuiet')}</b></div>`;
    return;
  }
  tape.innerHTML = signals.slice(0, 3).map(signal => {
    const change = Number(signal.market?.change24h);
    const direction = !Number.isFinite(change) ? 'flat' : change > 0 ? 'up' : change < 0 ? 'down' : 'flat';
    // No per-card "LIVE FEED" label: the stage header already says the market
    // is live, and repeating it three times pushed the actual ticker out of
    // the card. The name is the only thing here worth reading.
    return `<button class="tape-quote" data-signal="${esc(signal.id)}" type="button"><span><b>${esc(signal.name)}</b><small>${money(signal.market?.price, false)}</small></span><em class="${direction}">${signedPct(change)}</em></button>`;
  }).join('');
}

function renderMarketEvent() {
  const incidents = state.game.progression?.incidents;
  const button = $('marketEvent');
  const visible = Boolean(state.game.progression?.onboarding?.completed && (incidents?.active || incidents?.ready));
  button.classList.toggle('hidden', !visible);
  button.classList.toggle('active', Boolean(incidents?.active));
  button.disabled = Boolean(!incidents?.active && state.game.hero?.job);
  button.querySelector('b').textContent = incidents?.active?.title || t('marketEvent');
}

function renderStoryAction() {
  const button = $('storyAction');
  const onboarding = state.game.progression?.onboarding;
  const job = state.game.hero?.job;
  button.classList.remove('hidden');
  button.dataset.kind = '';
  button.dataset.value = '';
  const marker = button.querySelector('span');
  if (job) {
    marker.textContent = '···';
    button.querySelector('b').innerHTML = `<small>${t('operationRunning')}</small>${esc(job.label || t('launchSequence'))} · ${duration(job.remainingMs)}`;
    button.disabled = true;
    return;
  }
  button.disabled = false;
  if (!onboarding?.completed) {
    const step = Number(onboarding.step || 0);
    const setup = onboardingTaskView(onboarding);
    marker.textContent = `${step + 1}/5`;
    const actions = {
      0: ['action','emergency_lights', setup.title],
      1: ['action','boot_terminal', setup.title],
      2: ['screen','signals', setup.title],
      3: ['action','repair_power', setup.title],
      4: ['build','power', setup.title]
    };
    const current = actions[step] || actions[0];
    button.dataset.kind = current[0];
    button.dataset.value = current[1];
    button.querySelector('b').innerHTML = `<small>${t('onboardingProgress')}</small>${esc(current[2])}`;
    return;
  }
  marker.textContent = '→';
  const task = state.game.recommendedTask;
  if (!task) { button.classList.add('hidden'); return; }
  const copy = taskView(task);
  button.dataset.kind = task.target === 'map' ? 'screen' : 'mission';
  button.dataset.value = task.target === 'map' ? 'signals' : task.id;
  button.querySelector('b').innerHTML = `<small>${t('currentDirective')}</small>${esc(copy.title)}`;
}

function renderUpgrades() {
  const game = state.game;
  $('upgradeIncome').textContent = `${fmt(game.resources.productionPerHour)} ${t('income')}`;
  $('storageHours').textContent = `${game.resources.offlineCapacityHours}h`;
  const modules = game.modules || game.rooms;
  $('moduleGrid').innerHTML = (game.moduleOrder || game.roomOrder || []).map(id => {
    const item = modules[id];
    const copy = moduleCopy(id);
    const cost = item.nextUpgrade;
    const locked = !item.unlocked && !item.level;
    let action = `<button class="upgrade-button" type="button" disabled><b>${t('locked')}</b><small>${t('unlockReq')}</small></button>`;
    if (item.construction) action = `<button class="upgrade-button" type="button" disabled><b>${t('building')}</b><small>${duration(item.construction.remainingMs)}</small></button>`;
    else if (item.level >= item.maxLevel) action = `<button class="upgrade-button" type="button" disabled><b>${t('max')}</b><small>LV ${item.level}</small></button>`;
    else if (item.unlocked && cost) action = `<button class="upgrade-button" data-upgrade="${id}" type="button"><b>${item.level ? t('upgrade') : t('unlock')}</b><small>${fmt(cost.data)} I${cost.components ? ` · ${cost.components} ◆` : ''}</small></button>`;
    const levelProgress = Math.max(0, Math.min(100, Number(item.level || 0) / Number(item.maxLevel || 10) * 100));
    return `<article class="module-card ${locked ? 'locked' : ''}" style="--module-color:${copy.color}"><div class="module-icon">${copy.icon}</div><div class="module-copy"><div class="module-meta"><small>${t('level')} ${item.level}/${item.maxLevel}</small><span>+${fmt(item.intelPerHour || 0)} ${t('income')}</span></div><h3>${esc(copy.name)}</h3><p>${esc(copy.description)}</p><div class="module-level-track"><i style="width:${levelProgress}%"></i></div>${item.construction ? `<div class="build-progress"><i style="width:${Math.round((item.construction.progress || 0) * 100)}%"></i></div>` : ''}</div>${action}</article>`;
  }).join('');
}

const HORIZON_LABEL = { m5: '5m', m30: '30m', h1: '1h' };

function countdown(ms) {
  const total = Math.max(0, Math.round(Number(ms) || 0) / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = Math.floor(total % 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Open positions and the record they build.
 *
 * A position that is still running is deliberately anonymous — showing the
 * ticker before it settles would hand the player the answer they staked on.
 */
function renderPositions() {
  const host = $('positionPanel');
  if (!host) return;
  const positions = state.game.progression?.positions;
  if (!positions) { host.innerHTML = ''; return; }
  const open = positions.open || [];
  const stats = positions.stats || {};
  const winRate = stats.settled ? Math.round((stats.wins / stats.settled) * 100) : 0;

  const openMarkup = open.length
    ? open.map(position => `<div class="position-row ${position.ready ? 'ready' : ''}">
        <span class="position-mark">${position.ready ? icon('radar') : icon('clock')}</span>
        <span class="position-body"><b>${esc(position.name)}</b><small>${fmt(position.stake)} I ${t('posStaked')} · ${HORIZON_LABEL[position.horizon] || position.horizon}</small></span>
        ${position.ready
          ? `<button class="position-settle" data-settle="${esc(position.id)}" type="button">${t('posSettle')}</button>`
          : `<span class="position-timer" data-countdown="${Number(position.msRemaining) || 0}">${countdown(position.msRemaining)}</span>`}
      </div>`).join('')
    : '';

  const recordMarkup = stats.settled
    ? `<div class="position-record"><small>${t('posRecord')}</small><div class="record-grid">
        <span><small>${t('posWinRate')}</small><b>${winRate}%</b></span>
        <span><small>${t('posRealized')}</small><b class="${stats.realized >= 0 ? 'up' : 'down'}">${stats.realized >= 0 ? '+' : ''}${fmt(stats.realized)} I</b></span>
        <span><small>${t('posStreak')}</small><b>${fmt(stats.streak)}</b></span>
        <span><small>${t('posSettled')}</small><b>${fmt(stats.settled)}</b></span>
      </div>${stats.best ? `<p class="record-best">${t('posBest')}: <b>$${esc(stats.best.symbol)}</b> ${stats.best.pct > 0 ? '+' : ''}${stats.best.pct}% · +${fmt(stats.best.profit)} I</p>` : ''}</div>`
    : '';

  host.innerHTML = open.length || stats.settled
    ? `<article class="positions-card"><div class="card-title"><span class="card-glyph cyan">${icon('position')}</span><div><small>${t('posOpenTitle')}</small><h3>${fmt(open.length)}/${fmt(positions.maxOpen || 5)}</h3></div></div>${openMarkup}${recordMarkup}</article>`
    : '';
  scheduleCountdowns();
}

// One shared ticker: a timer per row would multiply intervals for nothing.
function scheduleCountdowns() {
  if (state.countdownTimer) return;
  state.countdownTimer = setInterval(() => {
    const nodes = document.querySelectorAll('[data-countdown]');
    if (!nodes.length) { clearInterval(state.countdownTimer); state.countdownTimer = null; return; }
    let expired = false;
    nodes.forEach(node => {
      const left = Math.max(0, Number(node.dataset.countdown) - 1000);
      node.dataset.countdown = String(left);
      node.textContent = countdown(left);
      if (left <= 0) expired = true;
    });
    if (expired) void refreshGame();
  }, 1000);
}

async function refreshGame() {
  try {
    const response = await api('/api/game');
    if (response.game) setGame(response.game);
  } catch { /* следующий тик попробует снова */ }
}

function renderSignals() {
  const game = state.game;
  const stats = game.stats || {};
  $('signalSummary').innerHTML = `<span><b>${pct(stats.accuracy30)}</b><small>${t('accuracy')}</small></span><span><b>${fmt(stats.attempts30)}</b><small>${t('attempts')}</small></span><span><b>${fmt(stats.correct30)}</b><small>${t('correct')}</small></span>`;
  renderPositions();
  const unlocked = Boolean(game.progression?.recon?.unlocked);
  const signals = unlocked ? (game.progression?.recon?.signals || []) : [];
  void ensureLiveSignals(unlocked, signals);
  if (!signals.length) {
    $('signalList').innerHTML = `<div class="empty-state"><span>⌁</span><h3>${t('noSignals')}</h3><p>${unlocked ? t('noSignalsText') : t('signalLocked')}</p></div>`;
    return;
  }
  $('signalList').innerHTML = signals.map((signal, index) => { const change = Number(signal.market?.change24h); const direction = !Number.isFinite(change) ? 'flat' : change > 0 ? 'up' : change < 0 ? 'down' : 'flat'; return `<button class="signal-card" data-signal="${esc(signal.id)}" type="button"><span class="signal-orbit">${index + 1}</span><span><h3>${esc(signal.name)}</h3><p>${money(signal.market?.price, false)} · ${t('liquidity')} ${fmt(signal.liquidity)}/100</p></span><span class="signal-side"><b class="${direction}">${signedPct(change)}</b><small>${signal.source === 'xradar' ? 'XRADAR LIVE' : 'LOCAL SCAN'}</small></span></button>`; }).join('');
}

/**
 * Achievements and gear.
 *
 * Both systems already existed in the engine and neither was ever drawn: the
 * player earned chips and equipment without being told. Showing progress is
 * the point — a locked box says nothing, a bar at 18/25 is a reason to play.
 */
function renderAchievements() {
  const host = $('achievementPanel');
  if (!host) return;
  const achievements = state.game.progression?.achievements;
  const rows = achievements?.progress || [];
  if (!rows.length) { host.innerHTML = ''; return; }
  const definitions = achievements.definitions || {};
  const earnedCount = rows.filter(row => row.earned).length;
  // Earned first, then whatever the player is closest to finishing.
  const ordered = [...rows].sort((a, b) => (b.earned - a.earned) || (b.progress - a.progress));
  const cards = ordered.map(row => {
    const copy = definitions[row.id] || {};
    return `<div class="achievement ${row.earned ? 'earned' : ''}">
      <span class="achievement-mark">${row.earned ? icon('check') : icon('lock')}</span>
      <span class="achievement-body">
        <b>${esc(copy.title || row.id)}</b>
        <small>${esc(copy.description || '')}</small>
        ${row.earned ? '' : `<span class="achievement-track"><i style="width:${Math.round(row.progress * 100)}%"></i></span><em>${fmt(row.value)} / ${fmt(row.target)}</em>`}
      </span>
      <span class="achievement-reward">+${fmt(row.components)} ◆</span>
    </div>`;
  }).join('');
  host.innerHTML = `<article class="achievements-card"><div class="card-title"><span class="card-glyph gold">${icon('award')}</span><div><small>${t('achTitle')}</small><h3>${earnedCount} / ${rows.length} ${t('achEarned')}</h3></div></div><div class="achievement-list">${cards}</div></article>`;
}

function renderGear() {
  const host = $('gearPanel');
  if (!host) return;
  const inventory = state.game.progression?.inventory;
  const owned = inventory?.owned || [];
  if (!owned.length) { host.innerHTML = ''; return; }
  const items = inventory.items || {};
  const outfit = state.game.hero?.outfit || {};
  const slotLabel = { body: t('gearSlotBody'), tool: t('gearSlotTool'), head: t('gearSlotHead') };
  const cards = owned.map(id => {
    const item = items[id] || {};
    const equipped = outfit[item.slot] === id;
    return `<button class="gear-item ${equipped ? 'equipped' : ''}" data-equip="${esc(id)}" type="button">
      <span class="gear-slot">${esc(slotLabel[item.slot] || item.slot || '')}</span>
      <b>${esc(item.name || id)}</b>
      <small>${esc(item.effect || '')}</small>
      <em>${equipped ? t('gearEquipped') : t('gearEquip')}</em>
    </button>`;
  }).join('');
  host.innerHTML = `<article class="gear-card"><div class="card-title"><span class="card-glyph violet">${icon('gear')}</span><div><small>${t('gearTitle')}</small><h3>${fmt(owned.length)}</h3></div></div><div class="gear-list">${cards}</div></article>`;
}

/**
 * The unlock moment. Without it the reward is a number that quietly changes.
 *
 * It is queued rather than shown immediately: achievements fire on exactly the
 * actions that open their own sheet (settling a position, resolving a signal),
 * and opening this one first meant the result sheet overwrote it a moment
 * later — the player never saw the unlock at all. It waits for a free screen.
 */
function renderAchievementUnlock() {
  const queued = state.game.progression?.achievements?.pending || [];
  for (const unlocked of queued) {
    if (!unlocked?.id || state.unlockQueue.some(item => item.id === unlocked.id)) continue;
    if (state.shownUnlocks.has(unlocked.id)) continue;
    state.unlockQueue.push(unlocked);
  }
  flushAchievementUnlock();
}

function flushAchievementUnlock() {
  const unlocked = state.pendingUnlock || state.unlockQueue[0];
  if (!unlocked) return;
  // Wait while a sheet is open or an action that is about to open one is running.
  if (state.sheet || state.decisionBusy || state.settleBusy || state.actionBusy) return;
  state.pendingUnlock = null;
  state.unlockQueue = state.unlockQueue.filter(item => item.id !== unlocked.id);
  state.shownUnlocks.add(unlocked.id);
  // Tell the server it has been celebrated, so a reload does not repeat it.
  void api('/api/game/achievements/ack', { method:'POST', body:{ ids:[unlocked.id] } }).catch(() => {});
  const copy = state.game.progression?.achievements?.definitions?.[unlocked.id] || {};
  const gear = unlocked.grants ? state.game.progression?.inventory?.items?.[unlocked.grants] : null;
  feel.unlock();
  haptic('success');
  openSheet(t('achUnlocked'), copy.title || unlocked.id, `<div class="unlock-hero"><span>${icon('award', 'ico-lg')}</span><p>${esc(copy.description || '')}</p></div>
    <div class="debrief-reward"><span><small>${t('achReward')}</small><b>+${fmt(unlocked.components)} ◆</b></span>${gear ? `<em>${t('achGear')}: ${esc(gear.name)}</em>` : ''}</div>
    <button class="action-button" data-debrief-close="true" type="button">${t('achClose')}</button>`);
}

/**
 * The referral payout moment, for both sides of the invite.
 *
 * Three notices share one queue: the welcome kit an invited operator gets on
 * arrival, the qualifying bonus they get once they have really played, and the
 * inviter's "your friend made it" with the chips it paid. They ride the same
 * wait-for-a-free-screen rule as achievement unlocks, and for the same reason —
 * these fire on actions that open their own sheet, and a sheet opened first is
 * a sheet the player never sees.
 */
function renderReferralReward() {
  const queued = state.game.progression?.referrals?.pending || [];
  for (const reward of queued) {
    if (!reward?.id || state.referralQueue.some(item => item.id === reward.id)) continue;
    if (state.shownReferralRewards.has(reward.id)) continue;
    state.referralQueue.push(reward);
  }
  flushReferralReward();
}

function flushReferralReward() {
  const reward = state.referralQueue[0];
  if (!reward) return;
  // Never jump an achievement unlock: that queue was already waiting.
  if (state.sheet || state.decisionBusy || state.settleBusy || state.actionBusy) return;
  if (state.pendingUnlock || state.unlockQueue.length) return;
  state.referralQueue = state.referralQueue.filter(item => item.id !== reward.id);
  state.shownReferralRewards.add(reward.id);
  void api('/api/game/referral/ack', { method:'POST', body:{ ids:[reward.id] } }).catch(() => {});

  const lines = [];
  if (reward.data) lines.push(`+${fmt(reward.data)} ${t('intel')}`);
  if (reward.components) lines.push(`+${fmt(reward.components)} ◆`);
  if (reward.signalPoints) lines.push(`+${fmt(reward.signalPoints)} SP`);
  const kicker = reward.kind === 'friend' ? t('refFriendKicker') : t('refRewardKicker');
  const title = reward.kind === 'welcome'
    ? t('refWelcomeTitle')
    : reward.kind === 'qualified'
      ? t('refQualifiedTitle')
      : t('refFriendTitle');
  const body = reward.kind === 'welcome'
    ? t('refWelcomeBody')
    : reward.kind === 'qualified'
      ? t('refQualifiedBody')
      : t('refFriendBody')(reward.name || t('refFriendFallback'));

  feel.unlock();
  haptic('success');
  openSheet(kicker, title, `<div class="unlock-hero"><span>${icon('network', 'ico-lg')}</span><p>${esc(body)}</p></div>
    <div class="debrief-reward"><span><small>${t('achReward')}</small><b>${lines.join(' · ')}</b></span></div>
    <button class="action-button" data-debrief-close="true" type="button">${t('achClose')}</button>`);
}

async function equipGear(itemId) {
  try {
    const response = await api('/api/game/inventory/equip', { method:'POST', body:{ itemId } });
    setGame(response.game);
    haptic('select');
  } catch (error) { notify(error.message, true); }
}

/* ── Social Quests — Blum-style task list into XRadar's socials ─────────────
 * Server-verifiable quests (referral/xradar/share) show Claim directly once
 * satisfied. link/share quests show Go first; after the player visits the link,
 * the client arms them and Claim unlocks — the norm for Telegram task lists.
 */
function renderQuests(game) {
  const list = $('questList');
  if (!list) return;
  const quests = game.gameplay?.quests || [];
  state.questArmed ||= {};
  list.innerHTML = quests.map(quest => {
    const label = t(`quest_${quest.id}`) || quest.id;
    const sp = Number(quest.reward?.signalPoints || 0);
    const armed = Boolean(state.questArmed[quest.id]);
    const canClaim = !quest.claimed && (quest.ready || armed);
    const needsGo = !quest.claimed && (quest.kind === 'link' || quest.kind === 'share') && !armed && !quest.ready;
    const progress = quest.progress ? ` <em>${fmt(quest.progress.current)}/${fmt(quest.progress.target)}</em>` : '';
    let action;
    if (quest.claimed) action = `<span class="quest-done">✓ ${t('questClaimed')}</span>`;
    else if (needsGo) action = `<button class="quest-go" data-quest-go="${esc(quest.id)}" type="button">${t('questGo')}</button>`;
    else if (canClaim) action = `<button class="quest-claim" data-quest-claim="${esc(quest.id)}" type="button">${t('questClaim')}</button>`;
    else action = `<button class="quest-go" data-quest-go="${esc(quest.id)}" type="button">${t('questGo')}</button>`;
    return `<div class="quest-row ${quest.claimed ? 'claimed' : ''}">
      <div class="quest-copy"><b>${esc(label)}${progress}</b><small>${t('questReward')(fmt(sp))}</small></div>
      ${action}
    </div>`;
  }).join('');
}

function questGo(id) {
  const quest = (state.game.gameplay?.quests || []).find(q => q.id === id);
  if (!quest) return;
  // Server-verified quests route to the real action; they become claimable on
  // the next state refresh once the condition is actually met, so there's no
  // arming timer for them.
  if (quest.kind === 'wallet') { connectWalletAction(); return; }
  if (quest.kind === 'trade' || quest.kind === 'xradar') { openXradar(); return; }
  // Open the external target, then arm the quest so Claim unlocks after a short
  // delay — long enough that the player actually did the action.
  if (quest.url) {
    if (tg?.openTelegramLink && quest.url.includes('t.me')) tg.openTelegramLink(quest.url);
    else if (tg?.openLink) tg.openLink(quest.url);
    else window.open(quest.url, '_blank', 'noopener');
  } else if (quest.kind === 'share') {
    void shareReferral('chat');
  }
  state.questArmed[id] = false;
  haptic('light');
  // Arm after a delay; re-render to flip Go → Claim.
  setTimeout(() => { state.questArmed[id] = true; renderQuests(state.game); notify(t('questArm')); }, 8000);
}

async function questClaim(id) {
  if (state.questBusy) return;
  state.questBusy = true;
  try {
    const armed = Boolean(state.questArmed[id]);
    const response = await api('/api/game/quest/claim', { method:'POST', body:{ questId:id, armed } });
    setGame(response.game);
    delete state.questArmed[id];
    const sp = Number(response.result?.reward?.signalPoints || 0);
    notify(t('questClaimedToast')(fmt(sp)));
    haptic('success');
  } catch (error) {
    notify(error.code === 'QUEST_NOT_DONE' ? t('questArm') : error.message, true);
    haptic('error');
  } finally { state.questBusy = false; }
}

/* ── Academy — learn-and-earn lessons ──────────────────────────────────────
 * Each lesson is a one-question check; a correct answer pays SP once. The
 * server verifies the answer, so a wrong pick simply shows the explanation.
 */
function renderAcademy(game) {
  const list = $('academyList');
  if (!list) return;
  const academy = game.gameplay?.academy;
  if (!academy) return;
  $('academyProgress').textContent = t('academyProgress')(fmt(academy.completedCount), fmt(academy.total));
  list.innerHTML = (academy.lessons || []).map(lesson => {
    const content = lessonContent(lesson.id);
    const title = content?.title || lesson.id;
    const icon = content?.icon || '✦';
    return `<button class="academy-row ${lesson.completed ? 'done' : ''}" data-lesson="${esc(lesson.id)}" type="button" ${lesson.completed ? 'disabled' : ''}>
      <span class="academy-icon">${icon}</span>
      <span class="academy-copy"><b>${esc(title)}</b><small>${lesson.completed ? t('academyDone') : `+${fmt(lesson.reward)} SP`}</small></span>
      <em>${lesson.completed ? '✓' : t('academyStart')}</em>
    </button>`;
  }).join('');
}

function openLesson(id) {
  const content = lessonContent(id);
  if (!content) return;
  const optionsHtml = content.opts.map((opt, index) =>
    `<button class="lesson-opt" data-lesson-answer="${index}" data-lesson-id="${esc(id)}" type="button">${esc(opt)}</button>`
  ).join('');
  openSheet(content.title, content.q, `<div class="lesson-opts">${optionsHtml}</div>`);
}

async function answerLesson(id, answerIndex) {
  if (state.lessonBusy) return;
  state.lessonBusy = true;
  const buttons = document.querySelectorAll('.lesson-opt');
  buttons.forEach(b => b.disabled = true);
  try {
    const response = await api('/api/game/academy/complete', { method:'POST', body:{ lessonId:id, answer:answerIndex } });
    const content = lessonContent(id);
    if (response.result?.correct) {
      setGame(response.game);
      buttons[answerIndex]?.classList.add('correct');
      const sp = Number(response.result.reward?.signalPoints || 0);
      showLessonResult(true, content.why, t('academyCorrect')(fmt(sp)));
      haptic('success');
    } else {
      const correctIndex = Number(response.result?.answer);
      buttons[answerIndex]?.classList.add('wrong');
      buttons[correctIndex]?.classList.add('correct');
      showLessonResult(false, content.why, t('academyWrong'));
      haptic('error');
    }
  } catch (error) {
    notify(error.message, true);
    buttons.forEach(b => b.disabled = false);
  } finally { state.lessonBusy = false; }
}

function showLessonResult(correct, why, headline) {
  const body = $('sheetBody');
  const note = document.createElement('div');
  note.className = `lesson-result ${correct ? 'good' : 'bad'}`;
  note.innerHTML = `<b>${esc(headline)}</b><p>${esc(why)}</p><button class="secondary-button" data-lesson-close="true" type="button">${t('academyNext')}</button>`;
  body.appendChild(note);
}

/**
 * Daily Briefing — the recurring Learn & Earn card. Shows today's lesson and a
 * code field; the code word is embedded in the lesson text, so claiming the
 * reward requires actually reading it. The code is never sent by the server, so
 * the answer can't be lifted from the game state.
 */
function renderBriefing(game) {
  const card = $('briefingCard');
  if (!card) return;
  const briefing = game.gameplay?.briefing;
  if (!briefing) { card.classList.add('hidden'); return; }
  card.classList.remove('hidden');

  const copy = t(`brief_${briefing.id}`) || { title: t('briefingTitle'), body: '' };
  $('briefingTitle').textContent = copy.title;
  $('briefingReward').textContent = briefing.claimed ? `✓ ${t('completed')}` : t('briefingReward')(briefing.reward);
  $('briefingText').textContent = copy.body;

  const body = $('briefingBody');
  if (briefing.claimed) {
    const streakLine = briefing.streak > 1 ? `<small class="briefing-streak">${esc(t('briefingStreak')(briefing.streak))}</small>` : '';
    body.innerHTML = `<div class="briefing-done"><b>✓ ${esc(t('briefingClaimed'))}</b><small>${esc(t('briefingBackTomorrow'))}</small>${streakLine}</div>`;
    return;
  }
  if (briefing.attemptsLeft <= 0) {
    body.innerHTML = `<p class="briefing-locked">${esc(t('briefingNoAttempts'))}</p>`;
    return;
  }
  body.innerHTML = `
    <div class="briefing-input">
      <input id="briefingCode" maxlength="24" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="${esc(t('briefingPlaceholder'))}">
      <button id="briefingSubmit" type="button">${esc(t('briefingSubmit'))}</button>
    </div>
    <p id="briefingFeedback" class="briefing-feedback"></p>`;

  const input = $('briefingCode');
  const submit = $('briefingSubmit');
  const send = () => submitBriefing(input.value);
  submit.addEventListener('click', send);
  input.addEventListener('keydown', event => { if (event.key === 'Enter') send(); });
}

async function submitBriefing(code) {
  const value = String(code || '').trim();
  if (!value) return;
  const submit = $('briefingSubmit');
  if (submit) { submit.disabled = true; submit.classList.add('loading'); }
  try {
    const response = await api('/api/game/briefing/submit', { method: 'POST', body: { code: value } });
    if (response.result?.correct) {
      const sp = response.result.reward?.signalPoints || 0;
      notify(t('briefingCorrect')(fmt(sp)));
      haptic('success');
      setGame(response.game);
    } else {
      const feedback = $('briefingFeedback');
      if (feedback) feedback.textContent = t('briefingWrong')(response.result?.attemptsLeft ?? 0);
      haptic('error');
      setGame(response.game);
    }
  } catch (error) {
    notify(error.message, true);
  } finally {
    const button = $('briefingSubmit');
    if (button) { button.disabled = false; button.classList.remove('loading'); }
  }
}

/**
 * Daily login ladder — a visible seven-day run. Printing tomorrow's reward next
 * to today's is the whole mechanic: the reason to come back is on screen, and
 * the day-7 prize is big enough that breaking the run costs something.
 */
function renderLadder(game) {
  const card = $('ladderCard');
  if (!card) return;
  const ladder = game.gameplay?.dailyLadder;
  if (!ladder) { card.innerHTML = ''; return; }

  const days = ladder.days.map(day => {
    const cls = `ladder-day${day.claimed ? ' claimed' : ''}${day.current ? ' current' : ''}`;
    const reward = day.signalPoints > 0
      ? `<b>${fmt(day.components)}</b><em>+${fmt(day.signalPoints)} SP</em>`
      : `<b>${fmt(day.components)}</b>`;
    return `<div class="${cls}">
      <small>${day.current ? esc(t('ladderToday')) : esc(t('ladderDay')(day.day))}</small>
      <span class="ladder-chip">${reward}</span>
      ${day.claimed ? '<i class="ladder-tick">✓</i>' : ''}
    </div>`;
  }).join('');

  card.innerHTML = `
    <div class="card-title"><span class="card-glyph green">✓</span><div><small>${esc(t('ladderKicker'))}</small><h3>${esc(t('ladderTitle'))}</h3></div><b class="ladder-streak">${esc(t('ladderStreakLabel')(ladder.streak))}</b></div>
    <div class="ladder-strip">${days}</div>
    <p class="ladder-hint">${esc(t('ladderHint'))} <span>${esc(t('ladderBest')(ladder.best))}</span></p>`;
}

/**
 * Terminal screen — the funnel from game to product, promoted from a buried
 * card to its own destination (Blum keeps its Memepad one tap away for exactly
 * this reason). The hero states the payoff in the game's own currency: verified
 * trades convert to Signal Points, which convert to season standing. The
 * conversion card below carries the existing rank ladder and sync.
 */
/* ── OPERATOR MARKETS ────────────────────────────────────────────────────────
 * Players list their own token on a public bonding curve and trade each other's.
 * The curve and the burn rate are shown in the UI on purpose: the whole point is
 * that the player can see exactly what they're buying into, the way a real
 * launchpad works. Signal Points are earned from unique traders attracted, never
 * from profit, and the card says so rather than leaving it implied. */

function msToClock(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400), h = Math.floor((total % 86400) / 3600), m = Math.floor((total % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

async function refreshMarkets(force = false) {
  if (state.marketsBusy) return;
  if (!force && state.marketsAt && Date.now() - state.marketsAt < 20_000) return;
  state.marketsBusy = true;
  try {
    const response = await api('/api/game/markets?mode=' + encodeURIComponent(state.marketSort || 'hot'));
    state.marketData = response;
    state.marketsAt = Date.now();
    renderMarkets();
  } catch (error) {
    const list = $('marketList');
    if (list) list.innerHTML = `<p class="market-empty">${esc(error.message)}</p>`;
  } finally { state.marketsBusy = false; }
}

async function refreshMarketCreators() {
  try {
    const response = await api('/api/game/markets/creators');
    state.marketCreators = response.creators || [];
    renderMarketCreators();
  } catch { /* leaderboard is non-critical */ }
}

function marketCardHtml(market, { compact = false } = {}) {
  const viewer = market.viewer;
  const settled = market.status === 'settled';
  const busy = state.marketTradeBusy === market.marketId;
  const timer = settled ? t('mSettled') : t('mEnds')(msToClock(market.msRemaining));
  const yours = viewer && viewer.shares > 0
    ? `<span class="market-yours">${esc(t('mYours')(fmt(Math.floor(viewer.shares))))}</span>` : '';
  const actions = settled
    ? (viewer && viewer.shares > 0
        ? `<button class="action-button" type="button" data-mredeem="${esc(market.marketId)}"${busy ? ' disabled' : ''}>${esc(t('mRedeem'))}</button>`
        : '')
    : `<div class="market-trade">
        <input class="market-input" type="number" min="10" step="10" placeholder="${esc(t('mIntelAmount'))}" data-mintel="${esc(market.marketId)}" inputmode="numeric">
        <button class="secondary-button" type="button" data-mbuy="${esc(market.marketId)}"${busy ? ' disabled' : ''}>${esc(busy ? t('mBuying') : t('mBuy'))}</button>
      </div>
      ${viewer && viewer.shares > 0 ? `<div class="market-trade">
        <input class="market-input" type="number" min="1" step="1" placeholder="${esc(t('mShareAmount'))}" data-mshares="${esc(market.marketId)}" inputmode="numeric">
        <button class="secondary-button danger" type="button" data-msell="${esc(market.marketId)}"${busy ? ' disabled' : ''}>${esc(busy ? t('mSelling') : t('mSell'))}</button>
      </div>` : ''}`;
  return `<article class="market-card${settled ? ' settled' : ''}">
    <div class="market-top">
      <div class="market-id"><b>$${esc(market.ticker)}</b><small>${esc(market.name)}</small></div>
      <div class="market-price"><b>${fmt(Math.round(market.price))}</b><small>${esc(t('mPrice'))}</small></div>
    </div>
    <div class="market-meta">
      <span>${esc(t('mSupply'))} ${fmt(Math.floor(market.supply))}</span>
      <span>${esc(t('mTraders'))} ${fmt(market.uniqueTraders)}</span>
      <span>${esc(t('mVolume'))} ${fmt(Math.round(market.volumeIntel))}</span>
      <span class="market-timer">${esc(timer)}</span>
    </div>
    ${yours}
    ${compact ? '' : actions}
  </article>`;
}

function renderMarkets() {
  const data = state.marketData;
  const list = $('marketList');
  if (!list) return;
  if (!data) { list.innerHTML = `<p class="market-empty">…</p>`; return; }

  const markets = data.markets || [];
  list.innerHTML = markets.length
    ? markets.map(market => marketCardHtml(market)).join('')
    : `<p class="market-empty">${esc(t('mEmpty'))}</p>`;

  // Your own positions, including markets that already settled and are
  // redeemable — otherwise a closed position would silently vanish from view.
  const mine = $('marketMine');
  const holdings = data.holdings || [];
  const me = data.me || {};
  if (mine) {
    mine.hidden = holdings.length === 0;
    if (holdings.length) {
      mine.innerHTML = `<div class="card-title"><span class="card-glyph violet">◈</span><div><small>${esc(t('mMineTitle'))}</small><h3>${esc(t('mSeasonSp')(fmt(me.seasonSignalPoints || 0), fmt(me.seasonCap || 0)))}</h3></div></div>
        <p class="market-rule">${esc(t('mRule'))}</p>
        ${holdings.map(market => marketCardHtml(market)).join('')}`;
    }
  }

  const create = $('marketCreate');
  if (create) {
    const cooldownHours = Math.ceil((me.createCooldownMs || 0) / 3_600_000);
    const curve = markets[0]?.curve || { base: 10, slope: 0.02, burnRate: 0.04 };
    create.innerHTML = `<div class="card-title"><span class="card-glyph gold">✦</span><div><small>${esc(t('mCreateKicker'))}</small><h3>${esc(t('mCreateTitle'))}</h3></div></div>
      <p>${esc(t('mCreateText')(fmt(me.createCost || 0), fmt(me.seedShares || 0)))}</p>
      <p class="market-curve">${esc(t('mCurve')(curve.base, curve.slope))} · ${esc(t('mBurn')(Math.round(curve.burnRate * 100)))}</p>
      ${me.canCreate ? `<div class="market-create-form">
          <input class="market-input" id="mTicker" maxlength="10" placeholder="${esc(t('mTicker'))}" autocapitalize="characters">
          <input class="market-input" id="mName" maxlength="32" placeholder="${esc(t('mName'))}">
        </div>
        <button class="action-button" type="button" id="mCreateBtn"${state.marketCreateBusy ? ' disabled' : ''}>${esc(state.marketCreateBusy ? t('mCreating') : t('mCreateCta'))}</button>`
        : `<p class="market-cooldown">${esc(t('mCooldown')(cooldownHours))}</p>`}`;
  }
}

function renderMarketCreators() {
  const node = $('marketCreators');
  if (!node) return;
  const creators = state.marketCreators || [];
  node.innerHTML = creators.length
    ? creators.map((creator, i) => `<div class="creator-row">
        <span class="creator-rank">${i + 1}</span>
        <span class="creator-name">${esc(creator.name || 'Operator')}${creator.genesisNumber ? `<small>#${esc(creator.genesisNumber)}</small>` : ''}</span>
        <span class="creator-stat">${fmt(creator.uniqueTraders || 0)} <small>${esc(t('mTraders'))}</small></span>
      </div>`).join('')
    : '';
}

async function createMarketAction() {
  if (state.marketCreateBusy) return;
  const ticker = ($('mTicker')?.value || '').trim().toUpperCase().replace(/^\$/, '');
  const name = ($('mName')?.value || '').trim();
  if (!ticker) return notify(t('mTicker'), true);
  state.marketCreateBusy = true;
  renderMarkets();
  try {
    const response = await api('/api/game/markets/create', { method: 'POST', body: { ticker, name: name || ticker } });
    setGame(response.game);
    notify(t('mCreated')(response.market.ticker));
    feel.reward(); haptic('success');
    await refreshMarkets(true);
    void refreshMarketCreators();
  } catch (error) { notify(error.message, true); haptic('error'); }
  finally { state.marketCreateBusy = false; renderMarkets(); }
}

async function marketTrade(marketId, kind) {
  if (state.marketTradeBusy) return;
  const intelInput = document.querySelector(`[data-mintel="${marketId}"]`);
  const shareInput = document.querySelector(`[data-mshares="${marketId}"]`);
  let path, body;
  if (kind === 'buy') {
    const intel = Math.floor(Number(intelInput?.value || 0));
    if (!(intel >= 10)) return notify(t('mIntelAmount'), true);
    path = `/api/game/markets/${marketId}/buy`; body = { intel };
  } else if (kind === 'sell') {
    const shares = Number(shareInput?.value || 0);
    if (!(shares > 0)) return notify(t('mShareAmount'), true);
    path = `/api/game/markets/${marketId}/sell`; body = { shares };
  } else {
    path = `/api/game/markets/${marketId}/redeem`; body = {};
  }
  state.marketTradeBusy = marketId;
  renderMarkets();
  haptic('medium');
  try {
    const response = await api(path, { method: 'POST', body });
    setGame(response.game);
    const result = response.result || {};
    if (kind === 'buy') notify(t('mBought')(fmt(Math.floor(result.shares || 0)), response.market.ticker));
    else if (kind === 'sell') notify(t('mSold')(fmt(Math.round(result.payout || 0))));
    else notify(t('mRedeemed')(fmt(Math.round(result.payout || 0))));
    feel.reward(); haptic('success');
    await refreshMarkets(true);
  } catch (error) { notify(error.message, true); haptic('error'); }
  finally { state.marketTradeBusy = null; renderMarkets(); }
}

function renderTerminal() {
  renderShop();
  if (state.termTab === 'markets') { void refreshMarkets(); void refreshMarketCreators(); }
  const hero = $('terminalHero');
  if (!hero) return;
  const available = Boolean(state.config?.xradarBotUrl || state.config?.xradarBaseUrl);
  if (!available) {
    hero.innerHTML = `<p class="terminal-unavailable">${esc(t('terminalUnavailable'))}</p>`;
    return;
  }
  const trading = state.game?.progression?.trading || {};
  const rank = trading.rank || { id: 'unranked' };
  const rankName = t(`rank${rank.id.charAt(0).toUpperCase()}${rank.id.slice(1)}`) || rank.id;

  hero.innerHTML = `
    <div class="terminal-hero-card">
      <div class="terminal-hero-mark">${icon('terminal')}</div>
      <b class="terminal-hero-rank">${esc(rankName)}</b>
      <div class="terminal-hero-stats">
        <span><small>${esc(t('tradeVolume'))}</small><b>$${fmt(Number(trading.volumeUsd || 0))}</b></span>
        <span><small>${esc(t('tradeCount'))}</small><b>${fmt(Number(trading.tradeCount || 0))}</b></span>
        <span><small>${esc(t('tradeEarned'))}</small><b>${fmt(Number(trading.signalPoints || 0))}</b></span>
      </div>
      <button class="terminal-hero-cta" type="button" data-reveal-open="">${esc(t('terminalOpenCta'))}</button>
      <small class="terminal-hero-note">${esc(t('terminalRate')(TRADE_SP_PER_TRADE_CLIENT))}</small>
    </div>`;
}
// Mirrors the engine's per-trade award purely for the explanatory line; the
// server remains the only thing that actually pays.
const TRADE_SP_PER_TRADE_CLIENT = 25;

/**
 * Profile — the player's own page.
 *
 * Every number here was already being tracked and none of it had a home: taps,
 * assessment accuracy, position record, sweep best, streaks, build depth. A long
 * game needs a place where the player sees their history rather than just their
 * current balances, which is why this is one of the most-visited screens in
 * games of this shape. Achievements and gear live here too, out of the Missions
 * basement where they were buried.
 */
function renderProfile() {
  const header = $('profileHeader');
  if (!header) return;
  const p = state.game?.profileStats;
  if (!p) { header.innerHTML = ''; return; }

  const initial = esc(String(p.callSign || 'O').slice(0, 1).toUpperCase());
  header.innerHTML = `
    <div class="profile-id">
      <span class="profile-avatar">${initial}</span>
      <div class="profile-name">
        <b>${esc(p.callSign)}</b>
        <small>${esc(leagueName(p.league))} · ${esc(t('profileDays')(fmt(p.daysActive)))}</small>
      </div>
      <div class="profile-score"><small>${esc(t('airdropTitle'))}</small><b>${fmt(p.airdropScore)}</b></div>
    </div>`;

  // Grouped so each block answers one question: how much have I played, how
  // well do I read signals, what have I built, how consistent am I.
  const groups = [
    {
      title: t('profileGroupActivity'),
      rows: [
        [t('profileTaps'), fmt(p.totalTaps)],
        [t('profileSweepBest'), fmt(p.sweepBest)],
        [t('profileSweepRounds'), fmt(p.sweepRounds)]
      ]
    },
    {
      title: t('profileGroupSkill'),
      rows: [
        [t('profileAssessments'), `${fmt(p.assessmentsCorrect)} / ${fmt(p.assessments)}`],
        [t('profileAccuracy'), p.assessments ? pct(p.accuracyAll) : '—'],
        [t('profileLiveCalls'), fmt(p.liveCalls)]
      ]
    },
    {
      title: t('profileGroupPositions'),
      rows: [
        [t('profilePositions'), `${fmt(p.positionsWon)} / ${fmt(p.positionsSettled)}`],
        [t('profilePositionStreak'), fmt(p.positionBestStreak)],
        [t('profileSeasonSp'), fmt(p.seasonSignalPoints)]
      ]
    },
    {
      title: t('profileGroupHabit'),
      rows: [
        [t('profileStreak'), `${fmt(p.streakCurrent)} · ${t('ladderBest')(fmt(p.streakBest))}`],
        [t('profileBriefings'), fmt(p.briefingsClaimed)],
        [t('profileReferrals'), fmt(p.referralsQualified)]
      ]
    },
    {
      title: t('profileGroupBuild'),
      rows: [
        [t('profileModuleLevels'), fmt(p.moduleLevels)],
        [t('profileAchievements'), `${fmt(p.achievementsEarned)} / ${fmt(p.achievementsTotal)}`],
        [t('profileGear'), fmt(p.gearOwned)]
      ]
    }
  ];

  $('profileStats').innerHTML = groups.map(group => `
    <article class="profile-block">
      <small class="profile-block-title">${esc(group.title)}</small>
      <div class="profile-rows">
        ${group.rows.map(([label, value]) => `<div class="profile-row"><span>${esc(label)}</span><b>${esc(String(value))}</b></div>`).join('')}
      </div>
    </article>`).join('');
}

/* ── DAILY SPIN ──────────────────────────────────────────────────────────────
 * The wheel is server-authoritative: the client renders the eight segments and,
 * on spin, animates to the index the server returns. It never decides the
 * outcome. */
const SPIN_SEG_ICON = { intel_s:'◆', intel_m:'◆', intel_l:'◆', chips_s:'◇', chips_m:'◇', sp_s:'★', sp_m:'★', lootbox:'▣' };
function spinSegmentLabel(seg) {
  const r = seg.reward || {};
  if (r.data) return `${fmt(r.data)}`;
  if (r.components) return `${fmt(r.components)}◇`;
  if (r.signalPoints) return `${fmt(r.signalPoints)} SP`;
  if (r.lootbox) return '▣';
  return '';
}
function rewardSummary(reward = {}) {
  const parts = [];
  if (reward.data) parts.push(`${fmt(reward.data)} Intel`);
  if (reward.components) parts.push(`${fmt(reward.components)} ◇`);
  if (reward.signalPoints) parts.push(`${fmt(reward.signalPoints)} SP`);
  if (reward.lootbox) parts.push(t(reward.lootbox === 'premium' ? 'lootboxPremium' : 'lootboxStandard'));
  return parts.join(' · ') || '—';
}

function renderSpin(game) {
  const card = $('spinCard');
  if (!card) return;
  const spin = game?.gameplay?.spin;
  if (!spin) { card.hidden = true; return; }
  card.hidden = false;
  const wheel = $('spinWheel');
  // Build the wheel once; segment count is fixed, so we only paint labels.
  if (wheel && wheel.dataset.built !== String(spin.segments.length)) {
    const n = spin.segments.length;
    const step = 360 / n;
    wheel.querySelectorAll('.spin-seg').forEach(node => node.remove());
    spin.segments.forEach((seg, i) => {
      const el = document.createElement('div');
      el.className = 'spin-seg';
      el.style.transform = `rotate(${i * step + step / 2}deg)`;
      el.innerHTML = `<span>${SPIN_SEG_ICON[seg.id] || '◆'}</span><b>${esc(spinSegmentLabel(seg))}</b>`;
      wheel.appendChild(el);
    });
    wheel.dataset.built = String(n);
  }
  $('spinStreak').textContent = spin.streak > 0 ? t('spinStreakLabel')(spin.streak) : '';
  const btn = $('spinButton');
  btn.disabled = !spin.ready || state.spinBusy || state.spinAnimating;
  btn.textContent = state.spinAnimating ? t('spinSpinning') : t('spinCta');
  $('spinMeta').textContent = spin.ready ? '' : t('spinNextFree');
}

async function doSpin() {
  if (state.spinBusy || state.spinAnimating) return;
  const spin = state.game?.gameplay?.spin;
  if (!spin?.ready) return;
  state.spinBusy = true;
  renderSpin(state.game);
  haptic('medium');
  try {
    const response = await api('/api/game/spin', { method:'POST', body:{} });
    const index = Number(response.result?.index || 0);
    const n = spin.segments.length;
    // Animate the wheel to the winning segment, then apply the new state so
    // the reward toast lands as the wheel stops.
    const wheel = $('spinWheel');
    const step = 360 / n;
    const target = 360 * 5 - (index * step + step / 2); // 5 full turns then settle
    state.spinAnimating = true;
    renderSpin(state.game);
    if (wheel) { wheel.style.transition = 'transform 3.4s cubic-bezier(.15,.9,.2,1)'; wheel.style.transform = `rotate(${target}deg)`; }
    setTimeout(() => {
      state.spinAnimating = false;
      if (wheel) { wheel.style.transition = 'none'; wheel.style.transform = `rotate(${target % 360}deg)`; }
      setGame(response.game);
      const reward = response.result?.reward || {};
      notify(t('spinWon')(rewardSummary(reward)));
      feel.reward(); haptic('success');
    }, 3450);
  } catch (error) {
    state.spinAnimating = false;
    notify(error.message, true); haptic('error');
    if (state.game) renderSpin(state.game);
  } finally {
    state.spinBusy = false;
  }
}

/* ── LOOTBOXES ───────────────────────────────────────────────────────────── */
function renderLootboxes(game) {
  const card = $('lootboxCard');
  if (!card) return;
  const boxes = game?.gameplay?.lootboxes;
  const owned = boxes?.owned || {};
  const total = Object.values(owned).reduce((a, b) => a + Number(b || 0), 0);
  if (!boxes || total < 1) { card.hidden = true; return; }
  card.hidden = false;
  const tiers = [['standard', 'lootboxStandard', '▣'], ['premium', 'lootboxPremium', '◈']];
  $('lootboxList').innerHTML = tiers
    .filter(([tier]) => Number(owned[tier] || 0) > 0)
    .map(([tier, key, glyph]) => `
      <div class="lootbox-row">
        <span class="lootbox-glyph ${tier === 'premium' ? 'gold' : 'violet'}">${glyph}</span>
        <span class="lootbox-name"><b>${esc(t(key))}</b><small>×${fmt(owned[tier])}</small></span>
        <button class="secondary-button" type="button" data-lootbox="${tier}"${state.lootboxBusy ? ' disabled' : ''}>${esc(t('lootboxOpen'))}</button>
      </div>`).join('');
}

async function openLootbox(tier) {
  if (state.lootboxBusy) return;
  state.lootboxBusy = true;
  renderLootboxes(state.game);
  haptic('medium');
  try {
    const response = await api('/api/game/lootbox/open', { method:'POST', body:{ tier } });
    setGame(response.game);
    notify(t('lootboxWon')(rewardSummary(response.result?.reward || {})));
    feel.reward(); haptic('success');
  } catch (error) {
    notify(error.message, true); haptic('error');
  } finally {
    state.lootboxBusy = false;
    if (state.game) renderLootboxes(state.game);
  }
}

/* ── WALLET CONNECT (TonConnect) ─────────────────────────────────────────────
 * The wallet is both a one-time quest and the airdrop-eligibility gate. We use
 * TonConnect UI when available; the connected address is sent to the server,
 * which validates it and pays the one-time reward. */
function tonConnectInstance() {
  if (state.tonConnect) return state.tonConnect;
  const TC = window.TON_CONNECT_UI;
  if (!TC?.TonConnectUI) return null;
  try {
    state.tonConnect = new TC.TonConnectUI({
      manifestUrl: `${location.origin}/tonconnect-manifest.json`
    });
    // When the wallet connects (or reconnects on load), push the address to the
    // server once. The address arrives raw (0:...) or user-friendly (EQ.../UQ...)
    // depending on the wallet; the server validates both shapes.
    state.tonUnsub = state.tonConnect.onStatusChange(wallet => {
      const address = wallet?.account?.address;
      if (address) void submitWallet(address);
      else if (state.game?.gameplay?.wallet?.connected) void disconnectWalletAction();
    });
  } catch { state.tonConnect = null; }
  return state.tonConnect;
}

function renderWallet(game) {
  const card = $('walletCard');
  if (!card) return;
  const wallet = game?.gameplay?.wallet || { connected: false };
  const reward = wallet.reward || { signalPoints: 0, components: 0 };
  if (wallet.connected) {
    card.innerHTML = `
      <div class="card-title"><span class="card-glyph gold">◉</span><div><small>${esc(t('walletKicker'))}</small><h3>${esc(t('walletConnectedLabel'))}</h3></div></div>
      <div class="wallet-connected">
        <code>${esc(t('walletShort')(wallet.address || ''))}</code>
        <button class="inline-link" type="button" data-wallet-disconnect="1">${esc(t('walletDisconnect'))}</button>
      </div>`;
    return;
  }
  card.innerHTML = `
    <div class="card-title"><span class="card-glyph cyan">◉</span><div><small>${esc(t('walletKicker'))}</small><h3>${esc(t('walletTitle'))}</h3></div><b class="wallet-reward">+${fmt(reward.signalPoints)} SP</b></div>
    <p>${esc(t('walletText'))}</p>
    <button class="action-button" type="button" data-wallet-connect="1"${state.walletBusy ? ' disabled' : ''}>${esc(state.walletBusy ? t('walletConnecting') : t('walletConnect'))}</button>
    <small class="wallet-note">${esc(t('walletRequired'))}</small>`;
}

async function connectWalletAction() {
  if (state.walletBusy) return;
  const ui = tonConnectInstance();
  if (!ui) return notify(t('walletError'), true);
  // If a wallet is already connected in the SDK (reconnect on load), the
  // onStatusChange handler has the address; opening the modal again is
  // harmless but unnecessary. TonConnect UI v2 exposes openModal(); older
  // builds used connectWallet(). Try both.
  try {
    if (typeof ui.openModal === 'function') { await ui.openModal(); return; }
    if (typeof ui.connectWallet === 'function') { await ui.connectWallet(); return; }
  } catch { /* user closed the modal or the connection failed */ }
  notify(t('walletError'), true);
}

async function submitWallet(address) {
  if (state.walletBusy) return;
  // Skip a no-op re-submit: if the server already has this exact address, the
  // TonConnect session just restored on load — nothing to persist or re-pay.
  const current = state.game?.gameplay?.wallet;
  if (current?.connected && current.address === String(address)) return;
  state.walletBusy = true;
  if (state.game) renderWallet(state.game);
  try {
    const response = await api('/api/game/wallet/connect', { method:'POST', body:{ address, chain:'ton' } });
    setGame(response.game);
    const reward = response.result?.reward;
    if (reward) { notify(t('walletConnectedReward')(fmt(reward.signalPoints), fmt(reward.components))); feel.reward(); haptic('success'); }
    else { notify(t('walletConnectedLabel')); haptic('success'); }
  } catch (error) {
    notify(error.message || t('walletError'), true); haptic('error');
  } finally {
    state.walletBusy = false;
    if (state.game) renderWallet(state.game);
  }
}

async function disconnectWalletAction() {
  if (state.walletBusy) return;
  state.walletBusy = true;
  try {
    try { await state.tonConnect?.disconnect?.(); } catch {}
    const response = await api('/api/game/wallet/disconnect', { method:'POST', body:{} });
    setGame(response.game);
    haptic('light');
  } catch (error) { notify(error.message, true); }
  finally { state.walletBusy = false; if (state.game) renderWallet(state.game); }
}

function renderMissions() {
  const game = state.game;
  void maybeSyncTrading();
  renderSpin(game);
  renderLootboxes(game);
  renderQuests(game);
  renderAcademy(game);
  renderBriefing(game);
  renderLadder(game);  const onboarding = game.progression?.onboarding;  const task = game.recommendedTask;
  const taskCopy = !onboarding?.completed ? onboardingTaskView(onboarding) : taskView(task);
  const storyMarker = !onboarding?.completed ? `${taskCopy.step + 1}/5` : '→';
  $('missionStory').innerHTML = !onboarding?.completed || task ? `<button class="story-card" data-story="true" type="button"><span>${storyMarker}</span><div><h3>${esc(taskCopy.title)}</h3><p>${esc(taskCopy.description)}</p></div></button>` : '';
  const combo = game.gameplay?.combo;
  if (combo?.claimed) state.selectedCombo = [];
  const comboStreak = Number(combo?.streak || 0);
  const projMult = Number(combo?.projectedMultiplier || 1);
  const projSp = Number(combo?.reward?.signalPoints || 40);
  const attemptsLeft = Number(combo?.attemptsLeft ?? 3);
  const noAttempts = !combo?.claimed && attemptsLeft <= 0;

  // Reward line shows the streak-boosted payout so the incentive is visible.
  $('comboReward').textContent = combo?.claimed
    ? `✓ ${t('completed')}`
    : (projMult > 1 ? `+${projSp} SP ×${projMult}` : `+${projSp} SP`);

  $('comboSlots').innerHTML = combo?.claimed
    ? [1,2,3].map(() => `<button class="combo-slot filled solved" type="button" disabled>✓</button>`).join('')
    : [0,1,2].map(index => {
      const key = state.selectedCombo[index];
      const disabled = noAttempts ? 'disabled' : '';
      return `<button class="combo-slot ${key ? 'filled' : ''}" data-combo-picker="true" type="button" ${disabled}>${key ? `${comboCardIcon(key)} ${esc(comboCardName(key))}` : `+ ${index + 1}`}</button>`;
    }).join('');

  // Attempts + streak meta line under the slots.
  const metaEl = $('comboMeta');
  if (metaEl) {
    if (combo?.claimed) {
      metaEl.innerHTML = `<span class="combo-streak-badge">🔥 ${esc(t('comboStreakDays')(comboStreak))}</span><span class="combo-mult">${esc(t('comboMultiplier')(projMult))}</span>`;
    } else if (noAttempts) {
      metaEl.innerHTML = `<span class="combo-attempts empty">${esc(t('comboNoAttempts'))}</span>`;
    } else {
      const streakBadge = comboStreak > 0 ? `<span class="combo-streak-badge">🔥 ${esc(t('comboStreakDays')(comboStreak))}</span>` : '';
      metaEl.innerHTML = `${streakBadge}<span class="combo-attempts">${esc(t('comboAttempts'))}: ${esc(t('comboAttemptsLeft')(attemptsLeft))}</span>`;
    }
  }

  $('comboSubmit').disabled = Boolean(combo?.claimed) || noAttempts;
  $('comboSubmit').textContent = combo?.claimed ? t('completed') : t('checkCombo');

  // Share button: only meaningful once solved (you have the answer to share).
  const shareEl = $('comboShare');
  if (shareEl) shareEl.classList.toggle('hidden', !combo?.claimed);
  $('cipherInput').disabled = Boolean(game.gameplay?.cipher?.claimed);
  $('cipherInput').placeholder = game.gameplay?.cipher?.hint || '_ _ _ _ _';
  $('cipherSubmit').disabled = Boolean(game.gameplay?.cipher?.claimed);
  $('cipherSubmit').textContent = game.gameplay?.cipher?.claimed ? '✓' : t('decode');
  $('dailyStats').innerHTML = `<div class="daily-stat"><b>${fmt(game.progression?.streak?.current)}</b><small>${t('streak')}</small></div><div class="daily-stat"><b>${fmt(game.progression?.daily?.attempts)}/5</b><small>${t('dailyCalls')}</small></div><div class="daily-stat"><b>${fmt(game.gameplay?.airdrop?.signalPoints)}</b><small>${t('signalPoints')}</small></div>`;
  const streak = Math.max(1, Number(game.progression?.streak?.current || 1));
  const cycleDay = ((streak - 1) % 7) + 1;
  const rewards = [1, 2, 3, 5, 8, 8, 8];
  const nextReward = rewards[Math.min(6, cycleDay)];
  $('streakCard').innerHTML = `<article class="streak-card"><div class="streak-card-head"><span><small>${t('loginStreak')}</small><b>${fmt(streak)} ${t('streakDays')}</b></span><b>${t('nextReward')}: +${nextReward} ◆</b></div><div class="streak-days">${rewards.map((reward, index) => { const day = index + 1; const status = day < cycleDay ? 'done' : day === cycleDay ? 'current' : ''; return `<span class="streak-day ${status}"><b>${status === 'done' ? '✓' : `${t('dayShort')}${day}`}</b><small>+${reward} ◆</small></span>`; }).join('')}</div></article>`;
  const briefTasks = [
    { label:t('scanTarget'), value:Math.min(100, Number(game.gameplay?.scan?.taps || 0)), max:100 },
    { label:t('assessTarget'), value:Math.min(5, Number(game.progression?.daily?.attempts || 0)), max:5 },
    { label:t('comboTarget'), value:game.gameplay?.combo?.claimed ? 1 : 0, max:1 },
    { label:t('cipherTarget'), value:game.gameplay?.cipher?.claimed ? 1 : 0, max:1 }
  ];
  const briefProgress = Math.round(briefTasks.reduce((sum, taskItem) => sum + taskItem.value / taskItem.max, 0) / briefTasks.length * 100);
  $('commandBrief').innerHTML = `<article class="command-brief"><div class="command-brief-head"><span><small>${t('dailyBrief')}</small><b>${t('briefProgress')}</b></span><em>${briefProgress}%</em></div><div class="brief-master-track"><i style="width:${briefProgress}%"></i></div><div class="brief-task-list">${briefTasks.map(taskItem => { const done = taskItem.value >= taskItem.max; return `<div class="brief-task ${done ? 'done' : ''}"><i>${done ? '✓' : ''}</i><span><b>${taskItem.label}</b><small>${fmt(taskItem.value)} / ${fmt(taskItem.max)}</small></span></div>`; }).join('')}</div></article>`;
}

function renderNetwork() {
  const game = state.game;
  renderWallet(game);
  renderGenesis();
  renderGrowthRankings();
  void refreshGrowthData();
  $('profileName').textContent = game.profile?.appearance?.callSign || game.profile?.firstName || 'Operator';
  const league = game.gameplay?.league || { id: 'observer', score: 0, progress: 0 };
  const nextCopy = league.next ? `${t('nextLeague')}: ${leagueName(league.next.id)} · ${fmt(league.next.min)} pts` : t('topLeague');
  $('leagueCard').innerHTML = `<div class="league-top"><span class="league-emblem">${leagueName(league.id).slice(0,1).toUpperCase()}</span><span><small>${t('season')} ${esc(game.gameplay?.airdrop?.seasonId || '')} · ${fmt(game.progression?.season?.daysRemaining)} ${t('daysLeft')}</small><h3>${esc(leagueName(league.id))}</h3></span><b>${fmt(league.score)}</b></div><div class="progress-bar"><i style="width:${Math.round((league.progress || 0) * 100)}%"></i></div><div class="progress-copy"><span>${esc(nextCopy)}</span><span>${Math.round((league.progress || 0) * 100)}%</span></div>`;
  const score = game.gameplay?.airdrop || { total: 0, breakdown: {} };
  $('scoreTotal').textContent = fmt(score.total);
  const labels = { network:'scoreNetwork', accuracy:'scoreAccuracy', activity:'scoreActivity', xradar:'scoreXradar', referrals:'scoreReferrals', wallet:'scoreWallet', signalPoints:'scoreSignalPoints' };
  const max = Math.max(1, ...Object.values(score.breakdown || {}));
  $('scoreBreakdown').innerHTML = Object.entries(score.breakdown || {}).map(([key, value]) => `<div class="score-row"><span>${t(labels[key] || key)}</span><div class="score-track"><i style="width:${Math.round(value / max * 100)}%"></i></div><b>${fmt(value)}</b></div>`).join('');
  $('referralCode').textContent = game.profile?.referralCode || '';
  renderFriends();
  void refreshFriends();
  renderTribe();
  void refreshTribeData();
  renderConversion();
  document.querySelectorAll('[data-language]').forEach(button => button.classList.toggle('active', button.dataset.language === state.language));
}

/**
 * Friends — the invite loop made visible. The card leads with the passive bonus
 * (the compounding "every friend earns for you" reward), then lists the invited
 * operators with each one's contribution, so growing the network is a concrete,
 * legible payoff rather than an abstract counter. A prominent invite CTA closes
 * the loop straight into Telegram's native share.
 */
function renderFriends() {
  const card = $('friendsCard');
  if (!card) return;
  const network = state.game?.progression?.referralNetwork || { qualified: 0, incomeBonusPct: 0, perFriendPct: 5, capPct: 150, atCap: false };
  const friends = Array.isArray(state.friends) ? state.friends : null;
  const qualified = Number(network.qualified || 0);

  const bonusHint = network.atCap
    ? t('friendsBonusAtCap')
    : t('friendsBonusHint')(network.perFriendPct, network.capPct);

  // The two-sided terms sit above the invite button, because "they get paid
  // too" is what makes the ask sendable. Rates come off the server so they
  // cannot drift from the economy that actually pays them out.
  const rates = state.game?.progression?.referralRewards;
  const termsMarkup = rates
    ? `<ul class="friends-terms">
        <li>${esc(t('friendsGive')(fmt(rates.welcome.data), fmt(rates.welcome.components)))}</li>
        <li>${esc(t('friendsBothPaid')(fmt(rates.inviter.components), fmt(rates.invitee.signalPoints)))}</li>
      </ul>`
    : '';

  const listMarkup = friends === null
    ? `<div class="friends-loading">${icon('network')}<span>${t('loading') || '…'}</span></div>`
    : friends.length === 0
      ? `<p class="friends-empty">${t('friendsEmpty')}</p>`
      : (() => {
          // Rank you against your qualified friends by Signal Points — the Blum
          // "you vs your friends" competition. Only qualified friends have a
          // meaningful SP total, so the board is built from them plus you.
          const mySp = Number(state.game?.gameplay?.airdrop?.signalPoints ?? state.game?.progression?.season?.signalPoints ?? 0);
          const ranked = friends
            .filter(f => f.qualified)
            .map(f => ({ name: f.name, sp: Number(f.signalPoints || 0), self: false, level: f.level }))
            .concat([{ name: t('friendsRankYou'), sp: mySp, self: true }])
            .sort((a, b) => b.sp - a.sp);
          const total = ranked.length;
          const myIndex = ranked.findIndex(r => r.self);
          const myRank = myIndex + 1;
          const ahead = myIndex > 0 ? ranked[myIndex - 1].sp - mySp : 0;
          const behind = myIndex < total - 1 ? mySp - ranked[myIndex + 1].sp : 0;
          const rankNote = total < 2 ? ''
            : myRank === 1 ? t('friendsRankTop')
            : ahead > 0 ? t('friendsRankLead')(fmt(ahead))
            : behind > 0 ? t('friendsRankBehind')(fmt(behind)) : '';
          const rankHead = total >= 2
            ? `<div class="friends-rank"><div class="friends-rank-head"><small>${t('friendsRankTitle')}</small><b>${t('friendsRankOf')(myRank, total)}</b></div><p class="friends-rank-note">${esc(rankNote)}</p></div>`
            : '';
          const listRows = ranked.map((row, i) => {
            const initial = esc(String(row.name || 'O').slice(0, 1).toUpperCase());
            return `<div class="friend-row ${row.self ? 'self' : 'qualified'}">
              <span class="friend-rank-num">${i + 1}</span>
              <span class="friend-avatar">${initial}</span>
              <span class="friend-meta"><strong>${esc(row.name)}</strong><small>${row.self ? '' : t('friendsLevel')(fmt(row.level))}</small></span>
              <em class="friend-sp">${fmt(row.sp)} SP</em>
            </div>`;
          }).join('');
          // Pending (not-yet-qualified) friends still shown below, so the invite
          // feels like it's growing even before they qualify.
          const pending = friends.filter(f => !f.qualified);
          const pendingRows = pending.length
            ? `<div class="friends-list-head"><small>${t('friendsPending')}</small></div><div class="friends-list">${pending.map(friend => {
                const initial = esc(String(friend.name || 'O').slice(0, 1).toUpperCase());
                return `<div class="friend-row pending">
                  <span class="friend-avatar">${initial}</span>
                  <span class="friend-meta"><strong>${esc(friend.name)}</strong><small>${t('friendsLevel')(fmt(friend.level))} · ${esc(t('friendsPending'))}</small></span>
                  <em class="friend-sp">—</em>
                </div>`;
              }).join('')}</div>`
            : '';
          return `${rankHead}<div class="friends-list-head"><small>${t('friendsListTitle')}</small></div><div class="friends-list">${listRows}</div>${pendingRows}`;
        })();

  card.innerHTML = `
    <div class="card-title"><span class="card-glyph gold">${icon('network')}</span><div><small>${t('friendsKicker')}</small><h3>${t('friendsTitle')}</h3></div><em class="friends-count">${t('friendsCount')(fmt(qualified))}</em></div>
    <div class="friends-bonus">
      <div class="friends-bonus-head"><small>${t('friendsBonusLabel')}</small><b>${t('friendsBonusValue')(network.incomeBonusPct)}</b></div>
      <div class="friends-bonus-track"><i style="width:${Math.min(100, Math.round((network.incomeBonusPct / Math.max(1, network.capPct)) * 100))}%"></i></div>
      <p class="friends-bonus-hint">${esc(bonusHint)}</p>
    </div>
    ${listMarkup}
    ${termsMarkup}
    <button id="friendsInvite" class="action-button friends-invite" type="button">${t('friendsInvite')}</button>`;

  const invite = $('friendsInvite');
  if (invite) invite.addEventListener('click', () => { haptic('select'); void shareReferral('chat'); });
}

async function refreshFriends() {
  // Cache for 20s so re-entering the Network screen doesn't re-hit the endpoint.
  if (state.friendsBusy) return;
  if (state.friends && Date.now() - state.friendsLoadedAt < 20_000) return;
  state.friendsBusy = true;
  try {
    const response = await api('/api/game/friends');
    state.friends = Array.isArray(response.friends) ? response.friends : [];
    state.friendsLoadedAt = Date.now();
    if (state.screen === 'network') renderFriends();
  } catch {
    state.friends = state.friends || [];
  } finally {
    state.friendsBusy = false;
  }
}

/**
 * The step from playing to actually using XRadar.
 *
 * The server already decides when a player has earned the invitation
 * (`conversionTriggers` — deep automation, a strong analysis module, a good
 * 30-day accuracy) and pays the bonus only against a trade it can verify in
 * the radar's own ledger. Without this card none of that was reachable.
 */
/* ── STATION STORE ───────────────────────────────────────────────────────────
 * The commerce backend (catalog, Stars invoices, TON payment requests and
 * verification) already existed and was fully wired server-side, but no UI ever
 * reached it, so nothing was purchasable. The catalog is fetched once and cached;
 * Stars purchases open a Telegram invoice, TON purchases go through TonConnect
 * and are then verified on-chain by the server. */
async function refreshCatalog() {
  if (state.catalog || state.catalogBusy) return;
  state.catalogBusy = true;
  try {
    const response = await api('/api/game/commerce/catalog');
    state.catalog = Array.isArray(response.products) ? response.products : [];
    if (state.screen === 'terminal') renderShop();
  } catch { state.catalog = []; }
  finally { state.catalogBusy = false; }
}

function renderShop() {
  const card = $('shopCard');
  if (!card) return;
  const products = state.catalog;
  if (products === null || products === undefined) { void refreshCatalog(); card.hidden = true; return; }
  const buyable = products.filter(p => p.starsEnabled || p.tonEnabled);
  if (!buyable.length) { card.hidden = true; return; }
  card.hidden = false;
  card.innerHTML = `
    <div class="card-title"><span class="card-glyph gold">◆</span><div><small>${esc(t('shopKicker'))}</small><h3>${esc(t('shopTitle'))}</h3></div></div>
    <div class="shop-list">${buyable.map(product => {
      const name = t(`product_${product.id}`) || product.name;
      const desc = t(`product_${product.id}_desc`) || product.description;
      const busy = state.shopBusy === product.id;
      const stars = product.starsEnabled
        ? `<button class="shop-buy stars" type="button" data-buy="${esc(product.id)}" data-method="stars"${busy ? ' disabled' : ''}>★ ${fmt(product.stars)}</button>`
        : '';
      const ton = product.tonEnabled
        ? `<button class="shop-buy ton" type="button" data-buy="${esc(product.id)}" data-method="ton"${busy ? ' disabled' : ''}>${(Number(product.tonNano) / 1e9).toFixed(2)} TON</button>`
        : '';
      return `<div class="shop-row">
        <div class="shop-copy"><b>${esc(name)}</b><small>${esc(desc)}</small></div>
        <div class="shop-actions">${stars}${ton}</div>
      </div>`;
    }).join('')}</div>`;
}

async function buyProduct(productId, method) {
  if (state.shopBusy) return;
  state.shopBusy = productId;
  renderShop();
  haptic('medium');
  try {
    const response = await api('/api/game/commerce/order', { method:'POST', body:{ productId, method } });
    if (method === 'stars') {
      // Telegram opens its own invoice sheet; the webhook credits the order.
      if (response.invoiceLink && tg?.openInvoice) {
        tg.openInvoice(response.invoiceLink, status => {
          if (status === 'paid') { notify(t('shopPaid')); feel.reward(); haptic('success'); void refreshGame(); }
          else if (status === 'pending') notify(t('shopPending'));
        });
      } else if (response.invoiceLink) {
        if (tg?.openTelegramLink) tg.openTelegramLink(response.invoiceLink);
        else window.open(response.invoiceLink, '_blank', 'noopener');
      }
      return;
    }
    // TON: send the prepared transaction through TonConnect, then ask the
    // server to verify it on-chain before crediting.
    const ui = tonConnectInstance();
    if (!ui) return notify(t('walletError'), true);
    await ui.sendTransaction(response.transaction);
    notify(t('shopVerifying'));
    const verify = await api('/api/game/commerce/ton/verify', { method:'POST', body:{ orderId: response.orderId } });
    if (verify.status === 'paid') { if (verify.game) setGame(verify.game); notify(t('shopPaid')); feel.reward(); haptic('success'); }
    else notify(t('shopPending'));
  } catch (error) {
    notify(error.message || t('shopUnavailable'), true); haptic('error');
  } finally {
    state.shopBusy = null;
    renderShop();
  }
}

function renderConversion() {
  const card = $('conversionCard');
  if (!card) return;
  if (!state.config?.xradarBotUrl && !state.config?.xradarBaseUrl) { card.hidden = true; return; }
  const progression = state.game?.progression || {};
  const claimed = (progression.conversionRewarded || []).includes('first_trade');
  // A trigger means the player reached a milestone worth naming; otherwise the
  // standing invitation is shown.
  const headline = progression.conversionTriggers?.[0]?.title || t('convText');
  card.hidden = false;
  card.innerHTML = `<div class="card-title"><span class="card-glyph cyan">${icon('terminal')}</span><div><small>${t('convKicker')}</small><h3>${t('convTitle')}</h3></div></div>
    <p>${esc(headline)}</p>
    <div class="conversion-actions">
      <button class="action-button" type="button" data-reveal-open="">${t('convOpen')}</button>
      ${claimed
        ? `<span class="conversion-claimed">✓ ${t('convClaimed')}</span>`
        : `<button class="secondary-button" type="button" data-conversion-claim="1">${t('convClaim')}</button>`}
    </div>
    ${renderTradeLadder(progression.trading)}`;
}

// The trading rank ladder: real XRadar volume rendered as game progression.
// Shown inside the conversion card once the player has any verified trading, or
// as an invitation to start when they have none.
function renderTradeLadder(trading) {
  const rank = trading?.rank || { id: 'unranked', progress: 0, next: null, nextVolume: null };
  const volume = Number(trading?.volumeUsd || 0);
  const trades = Number(trading?.tradeCount || 0);
  const earned = Number(trading?.signalPoints || 0);
  const rankName = t(`rank${rank.id.charAt(0).toUpperCase()}${rank.id.slice(1)}`) || rank.id;
  const nextLine = rank.next
    ? t('tradeRankNext')(t(`rank${rank.next.charAt(0).toUpperCase()}${rank.next.slice(1)}`) || rank.next, fmt(rank.nextVolume))
    : t('tradeRankMax');
  return `<div class="trade-ladder">
    <div class="trade-ladder-head"><span><small>${t('tradeLadderTitle')}</small><b>${esc(rankName)}</b></span><button class="trade-sync-btn" type="button" data-trade-sync="1">${t('tradeSync')}</button></div>
    <div class="trade-progress"><i style="width:${Math.round((rank.progress || 0) * 100)}%"></i></div>
    <div class="trade-progress-copy"><span>${esc(nextLine)}</span></div>
    <div class="trade-stats">
      <span><small>${t('tradeVolume')}</small><b>$${fmt(volume)}</b></span>
      <span><small>${t('tradeCount')}</small><b>${fmt(trades)}</b></span>
      <span><small>${t('tradeEarned')}</small><b>${fmt(earned)}</b></span>
    </div>
  </div>`;
}

async function syncTrading() {
  if (state.tradeSyncBusy) return;
  state.tradeSyncBusy = true;
  try {
    const response = await api('/api/game/trading/sync', { method:'POST', body:{} });
    if (!response.available) { notify(t('tradeUnavailable'), true); return; }
    if (!response.verified) { notify(t('tradeNotVerified'), true); return; }
    if (response.game) setGame(response.game);
    const granted = Number(response.result?.granted || 0);
    notify(t('tradeSynced')(granted));
    haptic(granted > 0 ? 'success' : 'light');
  } catch (error) {
    notify(error.message, true); haptic('error');
  } finally { state.tradeSyncBusy = false; }
}

// Silent, debounced trading sync so trade quests and the trading rank update on
// their own when the player returns. Only runs when the terminal is linked and
// at most once every few minutes. Unlike syncTrading() it never toasts.
async function maybeSyncTrading() {
  if (!state.config?.xradarBaseUrl && !state.config?.xradarBotUrl) return;
  if (state.tradeSyncBusy) return;
  if (state.tradeSyncAt && Date.now() - state.tradeSyncAt < 180_000) return;
  state.tradeSyncAt = Date.now();
  state.tradeSyncBusy = true;
  try {
    const response = await api('/api/game/trading/sync', { method:'POST', body:{} });
    if (response.available && response.verified && response.game) setGame(response.game);
  } catch { /* terminal unreachable — leave quests as they are */ }
  finally { state.tradeSyncBusy = false; }
}

async function claimConversion() {
  try {
    const response = await api('/api/game/conversion/verify', { method:'POST', body:{ event:'first_trade' } });
    if (response.game) setGame(response.game);
    notify(t('convVerified'));
  } catch (error) {
    notify(error.code === 'CONVERSION_NOT_VERIFIED' ? t('convNotVerified') : error.message, true);
  }
}

function renderGenesis() {
  const growth = state.game?.progression?.growth || {};
  const genesis = growth.genesis || {};
  const launch = state.launch || { limit:genesis.limit || 1000, genesisIssued:0, remaining:genesis.limit || 1000, activatedPlayers:0 };
  const number = Number(genesis.number || 0);
  const limit = Number(launch.limit || genesis.limit || 1000);
  const issued = Math.min(limit, Number(launch.genesisIssued || 0));
  const activation = growth.activation || {};
  const pulsesDone = Number(activation.pulses || 0) >= Number(activation.pulsesRequired || 25);
  const assessmentDone = Number(activation.assessments || 0) >= Number(activation.assessmentsRequired || 1);
  const statusCopy = number
    ? t('genesisClaimed')(number)
    : genesis.status === 'capacity_reached' ? t('genesisClosed') : t('genesisPending');
  const shareConfigured = Boolean(state.config?.referralSharingConfigured);
  $('genesisCard').className = `genesis-card ${number ? 'claimed' : ''}`;
  $('genesisCard').innerHTML = `<div class="genesis-radar" aria-hidden="true"><i></i><i></i><span>${number ? `#${number}` : '1K'}</span></div><div class="genesis-copy"><small>${t('genesisKicker')}</small><h3>${number ? esc(t('genesisClaimed')(number)) : t('genesisTitle')}</h3><p>${esc(statusCopy)}</p></div><div class="genesis-meter"><div><span>${t('genesisProgress')}</span><b>${fmt(issued)} / ${fmt(limit)}</b></div><div class="genesis-track"><i style="width:${Math.round(issued / Math.max(1, limit) * 100)}%"></i></div><em>${fmt(launch.remaining)} ${t('spotsRemaining')}</em></div><div class="genesis-requirements"><span class="${pulsesDone ? 'done' : ''}"><i>${pulsesDone ? '✓' : ''}</i>${t('pulsesRequired')}</span><span class="${assessmentDone ? 'done' : ''}"><i>${assessmentDone ? '✓' : ''}</i>${t('assessmentRequired')}</span></div><div class="genesis-actions"><button data-share-mode="chat" type="button" ${shareConfigured ? '' : 'disabled'}>${t('shareResult')}</button><button data-share-mode="story" type="button" ${shareConfigured ? '' : 'disabled'}>${t('shareStory')}</button></div>${shareConfigured ? '' : `<small class="genesis-warning">${t('sharingUnavailable')}</small>`}`;
}

function renderGrowthRankings() {
  const launch = state.launch || {};
  $('launchActivated').textContent = `${fmt(launch.activatedPlayers || 0)} ${t('activated')}`;
  const accuracy = state.accuracyLeaderboard || [];
  const referrals = state.referralLeaderboard || [];
  $('accuracyLeaderboard').innerHTML = accuracy.length ? accuracy.slice(0, 10).map(entry => `<div class="ranking-row ${entry.self ? 'self' : ''}"><b>${entry.rank}</b><span><strong>${esc(entry.name)}</strong><small>${entry.genesisNumber ? `GENESIS #${fmt(entry.genesisNumber)} · ` : ''}${fmt(entry.attempts)} ${t('callsShort')}</small></span><em>${fmt(entry.accuracy)}%</em></div>`).join('') : `<p class="ranking-empty">${t('noRankings')}</p>`;
  $('referralLeaderboard').innerHTML = referrals.length ? referrals.slice(0, 10).map(entry => `<div class="ranking-row ${entry.self ? 'self' : ''}"><b>${entry.rank}</b><span><strong>${esc(entry.name)}</strong><small>${entry.genesisNumber ? `GENESIS #${fmt(entry.genesisNumber)}` : `${fmt(entry.signalPoints)} SP`}</small></span><em>${fmt(entry.referrals)} ${t('referralsShort')}</em></div>`).join('') : `<p class="ranking-empty">${t('noRankings')}</p>`;
}

async function refreshGrowthData(force = false) {
  if (!state.game || state.growthBusy || (!force && Date.now() - state.growthLoadedAt < 15_000)) return;
  state.growthBusy = true;
  try {
    const [launch, accuracy, referrals] = await Promise.all([
      api('/api/launch/status'),
      api('/api/game/leaderboard?limit=10&mode=accuracy'),
      api('/api/game/leaderboard?limit=10&mode=referrals')
    ]);
    state.launch = launch.launch;
    state.accuracyLeaderboard = accuracy.entries || [];
    state.referralLeaderboard = referrals.entries || [];
    state.growthLoadedAt = Date.now();
    renderGenesis();
    renderGrowthRankings();
  } catch {}
  finally { state.growthBusy = false; }
}

/* ── Tribes ─────────────────────────────────────────────────────────────────
 * Membership summary (multiplier, faction) rides in game state; the full tribe
 * record (roster, invite code) and the standings are fetched lazily.
 */
const TRIBE_FACTION_ICON = { scout: '🔭', wallet: '🐋', risk: '🛡️', momentum: '⚡' };

function factionLabel(id) {
  const key = { scout:'factionScout', wallet:'factionWallet', risk:'factionRisk', momentum:'factionMomentum' }[id];
  return key ? t(key) : id;
}

function renderTribe() {
  const card = $('tribeCard');
  if (!card) return;
  const membership = state.game?.gameplay?.tribe;
  const tribe = state.tribe;

  // In a tribe: show roster, multiplier, invite, standings, leave.
  if (membership?.inTribe && tribe) {
    const mult = tribe.memberCount > 1 ? (Math.round(tribeClientMult(tribe.memberCount) * 100) / 100) : 1;
    const roster = (tribe.members || []).slice(0, 12).map(m =>
      `<div class="tribe-member ${m.self ? 'self' : ''}"><span>${m.role === 'leader' ? '★ ' : ''}${esc(m.name)}${m.self ? ` <em>(${t('tribeYou')})</em>` : ''}</span><b>${fmt(m.signalPoints)} SP</b></div>`
    ).join('');
    const solo = tribe.memberCount < 2 ? `<p class="tribe-solo">${t('tribeSoloHint')}</p>` : '';
    card.innerHTML = `
      <div class="tribe-head">
        <span class="tribe-emblem">${TRIBE_FACTION_ICON[tribe.faction] || '⚔️'}</span>
        <span class="tribe-id"><small>${esc(factionLabel(tribe.faction))} · ${t('tribeMembers')(tribe.memberCount, tribe.maxMembers)}</small><h3>${esc(tribe.name)}</h3></span>
        <b class="tribe-boost">${t('tribeBoost')(mult)}</b>
      </div>
      ${solo}
      <div class="tribe-invite"><small>${t('tribeInvite')}</small><code>${esc(tribe.inviteCode)}</code><button id="tribeShare" type="button">${t('tribeShareInvite')}</button></div>
      <div class="tribe-roster">${roster}</div>
      <div class="tribe-standings"><small>${t('tribeStandings')}</small><div id="tribeStandingsList" class="tribe-standings-list"></div></div>
      <button id="tribeLeave" class="tribe-leave" type="button">${t('tribeLeave')}</button>`;
    renderTribeStandings();
    $('tribeShare').addEventListener('click', shareTribeInvite);
    $('tribeLeave').addEventListener('click', leaveTribe);
    return;
  }

  // No tribe: create or join.
  card.innerHTML = `
    <div class="tribe-head no-tribe">
      <span class="kicker">${t('tribeKicker')}</span>
      <h3>${t('tribeTitle')}</h3>
    </div>
    <p class="tribe-intro">${t('tribeIntro')}</p>
    <div class="tribe-join-row">
      <input id="tribeJoinInput" maxlength="6" placeholder="${t('tribeInvitePlaceholder')}" autocapitalize="characters">
      <button id="tribeJoinBtn" type="button">${t('tribeJoin')}</button>
    </div>
    <button id="tribeCreateBtn" class="tribe-create" type="button">${t('tribeCreate')}</button>
    <div class="tribe-standings"><small>${t('tribeStandings')}</small><div id="tribeStandingsList" class="tribe-standings-list"></div></div>`;
  renderTribeStandings();
  $('tribeJoinBtn').addEventListener('click', () => joinTribe($('tribeJoinInput').value));
  $('tribeCreateBtn').addEventListener('click', openTribeCreate);
}

// Client mirror of the server's multiplier curve, for display only.
function tribeClientMult(n) {
  const count = Math.max(1, Math.floor(Number(n) || 1));
  return Math.min(1.5, 1 + (count - 1) * 0.04);
}

function renderTribeStandings() {
  const el = $('tribeStandingsList');
  if (!el) return;
  const rows = state.tribeLeaderboard || [];
  el.innerHTML = rows.length ? rows.slice(0, 8).map((row, index) => {
    const mine = state.tribe && row.tribeId === state.tribe.tribeId;
    return `<div class="tribe-standing-row ${mine ? 'self' : ''}"><b>${index + 1}</b><span>${TRIBE_FACTION_ICON[row.faction] || '⚔️'} ${esc(row.name)}</span><em>${fmt(row.totalSignalPoints)} SP</em></div>`;
  }).join('') : `<p class="ranking-empty">${t('noRankings')}</p>`;
}

async function refreshTribeData(force = false) {
  if (!state.game || state.tribeBusy || (!force && Date.now() - state.tribeLoadedAt < 15_000)) return;
  state.tribeBusy = true;
  try {
    const response = await api('/api/game/tribe?limit=20');
    state.tribe = response.tribe || null;
    state.tribeLeaderboard = response.leaderboard || [];
    state.tribeLoadedAt = Date.now();
    renderTribe();
  } catch {}
  finally { state.tribeBusy = false; }
}

function openTribeCreate() {
  state.tribeFaction = state.tribeFaction || 'scout';
  const factions = ['scout','wallet','risk','momentum'];
  openSheet(t('tribeKicker'), t('tribeCreateTitle'),
    `<input id="tribeNameInput" class="sheet-input" maxlength="24" placeholder="${t('tribeNamePlaceholder')}">` +
    `<p class="sheet-description">${t('tribeChooseFaction')}</p>` +
    `<div class="faction-picker">${factions.map(id =>
      `<button class="faction-pick ${state.tribeFaction === id ? 'selected' : ''}" data-faction="${id}" type="button"><b>${TRIBE_FACTION_ICON[id]}</b><small>${esc(factionLabel(id))}</small></button>`
    ).join('')}</div>` +
    `<button class="action-button" style="margin-top:12px" data-tribe-create-confirm="true" type="button">${t('tribeCreate')}</button>`);
}

async function createTribe() {
  const name = $('tribeNameInput')?.value?.trim();
  if (!name || name.length < 3) return notify(t('tribeNamePlaceholder'), true);
  if (state.tribeBusy) return;
  state.tribeBusy = true;
  try {
    const response = await api('/api/game/tribe/create', { method:'POST', body:{ name, faction: state.tribeFaction || 'scout' } });
    setGame(response.game);
    state.tribe = response.tribe;
    state.tribeLoadedAt = 0;
    closeSheet();
    renderTribe();
    void refreshTribeData(true);
    notify(t('tribeCreated')); haptic('success');
  } catch (error) { notify(error.message, true); haptic('error'); }
  finally { state.tribeBusy = false; }
}

async function joinTribe(code) {
  const inviteCode = String(code || '').trim().toUpperCase();
  if (inviteCode.length < 4) return notify(t('tribeInvitePlaceholder'), true);
  if (state.tribeBusy) return;
  state.tribeBusy = true;
  try {
    const response = await api('/api/game/tribe/join', { method:'POST', body:{ inviteCode } });
    setGame(response.game);
    state.tribe = response.tribe;
    state.tribeLoadedAt = 0;
    renderTribe();
    void refreshTribeData(true);
    notify(t('tribeJoined')); haptic('success');
  } catch (error) { notify(error.message, true); haptic('error'); }
  finally { state.tribeBusy = false; }
}

async function leaveTribe() {
  const proceed = await tribeConfirm(t('tribeLeaveConfirm'));
  if (!proceed) return;
  if (state.tribeBusy) return;
  state.tribeBusy = true;
  try {
    const response = await api('/api/game/tribe/leave', { method:'POST', body:{} });
    setGame(response.game);
    state.tribe = null;
    state.tribeLoadedAt = 0;
    renderTribe();
    void refreshTribeData(true);
    notify(t('tribeLeft')); haptic('warning');
  } catch (error) { notify(error.message, true); haptic('error'); }
  finally { state.tribeBusy = false; }
}

// Telegram's native confirm when available, falling back to window.confirm.
function tribeConfirm(message) {
  return new Promise(resolve => {
    if (tg?.showConfirm) tg.showConfirm(message, ok => resolve(Boolean(ok)));
    else resolve(window.confirm(message));
  });
}

async function shareTribeInvite() {
  const tribe = state.tribe;
  if (!tribe) return;
  try {
    const url = state.config?.telegramMiniAppUrl
      ? `${state.config.telegramMiniAppUrl}?startapp=tribe_${encodeURIComponent(tribe.inviteCode)}`
      : `${location.origin}?tribe=${encodeURIComponent(tribe.inviteCode)}`;
    const text = t('tribeShareText')(tribe.name, tribe.inviteCode);
    const telegramShare = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    if (tg?.openTelegramLink) tg.openTelegramLink(telegramShare);
    else if (navigator.share) await navigator.share({ text, url });
    else { await navigator.clipboard.writeText(`${text} ${url}`); notify(t('tribeInviteCopied')); }
    haptic('success');
  } catch (error) { notify(error.message, true); }
}

function setScreen(screen) {
  if (!['radar','upgrades','signals','missions','network','terminal','profile'].includes(screen)) return;
  state.screen = screen;
  document.querySelectorAll('.screen').forEach(node => node.classList.toggle('active', node.id === `screen-${screen}`));
  document.querySelectorAll('[data-screen]').forEach(button => button.classList.toggle('active', button.dataset.screen === screen));
  // The radar screen carries its own Blum-style banner (level, balance, CTA), so
  // the shared topbar would double the resource readout there — hide it on radar,
  // show it everywhere else.
  document.body.classList.toggle('radar-active', screen === 'radar');
  closeSheet();
  if (screen === 'network') { void refreshGrowthData(true); void refreshTribeData(true); }
  haptic('select');
}

function openSheet(eyebrow, title, html) {
  state.lastFocus = document.activeElement;
  $('sheetEyebrow').textContent = eyebrow;
  $('sheetTitle').textContent = title;
  $('sheetBody').innerHTML = html;
  $('sheet').classList.add('open');
  $('sheet').setAttribute('aria-hidden', 'false');
  state.sheet = title;
  requestAnimationFrame(() => $('sheetClose').focus({ preventScroll:true }));
}

function closeSheet() {
  const wasOpen = $('sheet').classList.contains('open');
  $('sheet').classList.remove('open');
  $('sheet').setAttribute('aria-hidden', 'true');
  state.sheet = null;
  if (wasOpen && state.lastFocus?.isConnected) state.lastFocus.focus({ preventScroll:true });
  state.lastFocus = null;
  // Queued achievements wait for exactly this moment, and follow one another.
  if (wasOpen && (state.pendingUnlock || state.unlockQueue.length)) setTimeout(flushAchievementUnlock, 280);
  else if (wasOpen && state.referralQueue.length) setTimeout(flushReferralReward, 280);
}

function openSignal(id) {
  if (!state.game.progression?.recon?.unlocked) return notify(t('signalLocked'), true);
  const signal = state.game.progression?.recon?.signals?.find(item => item.id === id);
  if (!signal) return;
  if (state.activeSignalId !== id) { state.selectedFactors = []; state.stake = null; }
  state.activeSignalId = id;
  const positions = state.game.progression?.positions || {};
  const maxStake = Math.max(0, Math.floor(Number(positions.maxStake) || 0));
  const minStake = Math.max(1, Math.floor(Number(positions.minStake) || 50));
  // Three tiers instead of a slider: on a phone a slider is fiddly and the
  // exact number matters far less than the size of the commitment.
  const stakeTiers = [...new Set([minStake, Math.floor(maxStake / 2), maxStake])].filter(value => value >= minStake && value <= maxStake);
  if (!stakeTiers.includes(state.stake)) state.stake = stakeTiers[0] ?? null;
  if (!positions.horizons?.includes(state.horizon)) state.horizon = 'm30';
  const canStake = stakeTiers.length > 0 && (positions.open?.length || 0) < (positions.maxOpen || 5);
  const horizonLabel = { m5: '5m', m30: '30m', h1: '1h' };
  const stakeMarkup = stakeTiers.map(value => `<button class="stake-chip ${state.stake === value ? 'selected' : ''}" data-stake="${value}" type="button">${fmt(value)}</button>`).join('');
  const horizonMarkup = (positions.horizons || ['m5', 'm30', 'h1']).map(key => `<button class="horizon-chip ${state.horizon === key ? 'selected' : ''}" data-horizon="${key}" type="button"><b>${horizonLabel[key] || key}</b><small>×${(positions.multipliers?.[key] ?? 1)}</small></button>`).join('');
  const positionPanel = canStake
    ? `<div class="position-panel"><div class="evidence-title"><small>${t('posTitle')}</small><p>${t('posHelp')}</p></div><div class="stake-row"><small>${t('posStake')}</small><div class="chip-row">${stakeMarkup}</div></div><div class="stake-row"><small>${t('posHorizon')}</small><div class="chip-row">${horizonMarkup}</div></div></div>`
    : '';
  const market = signal.market || {};
  const change = Number(market.change24h);
  const direction = !Number.isFinite(change) ? 'flat' : change > 0 ? 'up' : change < 0 ? 'down' : 'flat';
  const concentration = Number.isFinite(Number(signal.concentration)) ? `${fmt(signal.concentration)}%` : t('encrypted');
  const factorOptions = [
    ['thin_liquidity', 'factorThin', 'factorThinText', true],
    ['abnormal_activity', 'factorActivity', 'factorActivityText', true],
    ['holder_concentration', 'factorConcentration', 'factorConcentrationText', Number.isFinite(Number(signal.concentration))],
    ['mutable_contract', 'factorMutable', 'factorMutableText', typeof signal.mutable === 'boolean'],
    ['no_critical_flags', 'factorClear', 'factorClearText', true]
  ].filter(option => option[3]);
  const factorMarkup = factorOptions.map(([factorId, titleKey, textKey]) => `<button class="evidence-factor ${state.selectedFactors.includes(factorId) ? 'selected' : ''}" data-factor="${factorId}" type="button"><i>${state.selectedFactors.includes(factorId) ? '✓' : '+'}</i><span><b>${t(titleKey)}</b><small>${t(textKey)}</small></span></button>`).join('');
  openSheet(t('signalEvidence'), signal.name, `<div class="signal-market-head"><span><small>${t('price')}</small><b>${money(market.price, false)}</b></span><em class="${direction}">${signedPct(change)}</em></div><div class="signal-chart"><canvas id="signalChart" height="150" aria-label="${esc(signal.name)} price chart"></canvas><span>24H</span></div><div class="market-stat-grid"><div><small>${t('volume24h')}</small><b>${money(market.volume24hUsd)}</b></div><div><small>${t('marketCap')}</small><b>${money(market.marketCapUsd)}</b></div><div><small>${t('holders')}</small><b>${Number.isFinite(Number(market.holders)) ? fmt(market.holders) : t('encrypted')}</b></div><div><small>${t('tokenAge')}</small><b>${Number.isFinite(Number(market.ageHours)) ? `${fmt(market.ageHours)}${t('hoursShort')}` : t('encrypted')}</b></div></div><div class="evidence-title"><small>${t('signalEvidence')}</small><p>${t('signalActionHelp')}</p></div><div class="metric-grid"><div class="metric"><small>${t('activity')}</small><b>${fmt(signal.activity)}/100</b></div><div class="metric"><small>${t('liquidity')}</small><b>${fmt(signal.liquidity)}/100</b></div><div class="metric ${concentration === t('encrypted') ? 'locked-metric' : ''}"><small>${t('concentration')}</small><b>${concentration}</b></div><div class="metric"><small>${t('change24h')}</small><b class="${direction}">${signedPct(change)}</b></div></div><div class="hypothesis-head"><small>${t('buildHypothesis')}</small><b id="factorCount">${state.selectedFactors.length} ${t('factorsMarked')}</b></div><div class="evidence-factor-list">${factorMarkup}</div>${positionPanel}<div class="decision-grid sticky-decisions">${canStake ? `<button class="decision-study" data-open-position="${esc(id)}" type="button" ${state.selectedFactors.length ? '' : 'disabled'}>${t('posOpen')}</button>` : `<button class="decision-study" data-decision="study" data-signal-id="${esc(id)}" type="button" ${state.selectedFactors.length ? '' : 'disabled'}>${t('analyze')}</button>`}<button class="decision-skip" data-decision="skip" data-signal-id="${esc(id)}" type="button" ${state.selectedFactors.length ? '' : 'disabled'}>${t('posIgnore')}</button></div>`);
  requestAnimationFrame(() => drawSignalChart(market.priceSeries || []));
}

function toggleEvidenceFactor(id) {
  if (id === 'no_critical_flags') state.selectedFactors = state.selectedFactors.includes(id) ? [] : [id];
  else {
    state.selectedFactors = state.selectedFactors.filter(item => item !== 'no_critical_flags');
    state.selectedFactors = state.selectedFactors.includes(id) ? state.selectedFactors.filter(item => item !== id) : [...state.selectedFactors, id];
  }
  document.querySelectorAll('[data-factor]').forEach(button => {
    const selected = state.selectedFactors.includes(button.dataset.factor);
    button.classList.toggle('selected', selected);
    button.querySelector('i').textContent = selected ? '✓' : '+';
  });
  if ($('factorCount')) $('factorCount').textContent = `${state.selectedFactors.length} ${t('factorsMarked')}`;
  document.querySelectorAll('[data-decision]').forEach(button => { button.disabled = state.selectedFactors.length < 1; });
  haptic('select');
}

function factorLabel(id) {
  return t({ thin_liquidity:'factorThin', holder_concentration:'factorConcentration', mutable_contract:'factorMutable', abnormal_activity:'factorActivity', no_critical_flags:'factorClear' }[id] || id);
}

/**
 * The payoff of a live signal: name the token, show what it really did and
 * offer the terminal. Local signals have no reveal and skip this entirely.
 *
 * The move is labelled by how it was measured — movement after XRadar flagged
 * the token reads very differently from a plain hourly change, and conflating
 * them would overclaim what the radar predicted.
 */
function revealMarkup(reveal, correct) {
  const pct = Number(reveal.actualPct || 0);
  const move = `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`;
  const windowLabel = reveal.window === 'since_issue' ? t('revealSince') : t('revealHour');
  const openAttr = reveal.mint ? ` data-reveal-open="${esc(reveal.mint)}"` : ' data-reveal-open=""';
  return `<div class="reveal ${correct ? 'success' : 'review'}">
    <div class="reveal-head"><small>${t('revealTitle')}</small><b>$${esc(reveal.symbol)}</b>${reveal.dex ? `<em>${esc(reveal.dex)}</em>` : ''}</div>
    <div class="reveal-move ${pct >= 0 ? 'up' : 'down'}"><b>${move}</b><small>${windowLabel}</small></div>
    <div class="reveal-scores"><span><small>${t('revealScore')}</small><b>${fmt(reveal.xradarScore)}/100</b></span><span><small>${t('riskScore')}</small><b>${fmt(reveal.riskScore)}/100</b></span></div>
    <div class="reveal-actions"><button class="action-button reveal-open" type="button"${openAttr}>${t('revealOpen')}</button><button class="secondary-button reveal-share" type="button" data-reveal-share="1">${t('revealShare')}</button></div>
    <small class="reveal-note">${t('revealLive')}</small>
  </div>`;
}

function showSignalDebrief(result) {
  state.lastReveal = result.source === 'xradar' && result.reveal ? { reveal:result.reveal, correct:result.correct } : null;
  const evidence = result.evidence || { score:0, relevant:[], matched:[] };
  const reward = result.reward || {};
  const relevant = (evidence.relevant || []).map(id => `<span class="debrief-factor ${evidence.matched?.includes(id) ? 'matched' : ''}">${evidence.matched?.includes(id) ? '✓' : '·'} ${esc(factorLabel(id))}</span>`).join('');
  const incorrect = (evidence.incorrect || []).map(id => `<span class="debrief-factor incorrect">× ${esc(factorLabel(id))}</span>`).join('');
  const rewardCopy = `+${fmt(reward.data)} I${reward.components ? ` · +${fmt(reward.components)} ◆` : ''}${reward.signalPoints ? ` · +${fmt(reward.signalPoints)} SP` : ''}`;
  const reveal = state.lastReveal ? revealMarkup(state.lastReveal.reveal, result.correct) : '';
  openSheet(t('outcomeReport'), result.correct ? t('thesisConfirmed') : t('thesisRevised'), `<div class="debrief-hero ${result.correct ? 'success' : 'review'}"><div class="debrief-score" style="--score:${Math.max(0, Math.min(100, Number(evidence.score || 0)))}%"><span><b>${fmt(evidence.score)}</b><small>${t('evidenceScore')}</small></span></div><div><small>${result.correct ? t('correctCall') : t('wrongCall')}</small><b>${t('riskScore')}: ${fmt(result.risk)}/100</b></div></div><p class="debrief-explanation">${esc(result.explanation || '')}</p><div class="debrief-section"><small>${t('relevantEvidence')}</small><div class="debrief-factors">${relevant || `<span class="debrief-factor">${t('encrypted')}</span>`}</div></div>${incorrect ? `<div class="debrief-section debrief-incorrect"><small>${t('unsupportedEvidence')}</small><div class="debrief-factors">${incorrect}</div></div>` : ''}<div class="debrief-reward"><span><small>${t('rewardEarned')}</small><b>${rewardCopy}</b></span>${reward.evidenceData ? `<em>+${fmt(reward.evidenceData)} I ${t('insightBonus')}</em>` : ''}</div>${reveal}<button class="action-button debrief-continue" data-debrief-close="true" type="button">${t('continue')}</button>`);
}

function drawSignalChart(series) {
  const canvas = $('signalChart');
  if (!canvas || !Array.isArray(series) || series.length < 2) return;
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(280, Math.round(rect.width || 320));
  const height = 150;
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  const ctx = canvas.getContext('2d');
  ctx.scale(ratio, ratio);
  const values = series.map(Number).filter(Number.isFinite);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = Math.max(0.00000001, maximum - minimum);
  const x = index => index / (values.length - 1) * width;
  const y = value => 12 + (1 - (value - minimum) / range) * (height - 30);
  ctx.strokeStyle = 'rgba(255,255,255,.055)';
  ctx.lineWidth = 1;
  for (let row = 1; row < 4; row += 1) { const py = row * height / 4; ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(width, py); ctx.stroke(); }
  ctx.beginPath();
  values.forEach((value, index) => index ? ctx.lineTo(x(index), y(value)) : ctx.moveTo(x(index), y(value)));
  const rising = values.at(-1) >= values[0];
  const color = rising ? '#5ac8fa' : '#ff6b63';
  const fill = ctx.createLinearGradient(0, 0, 0, height);
  fill.addColorStop(0, rising ? 'rgba(90,200,250,.24)' : 'rgba(255,69,58,.2)');
  fill.addColorStop(1, 'rgba(5,5,5,0)');
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.beginPath();
  values.forEach((value, index) => index ? ctx.lineTo(x(index), y(value)) : ctx.moveTo(x(index), y(value)));
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(width - 2, y(values.at(-1)), 3, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

function openComboPicker() {
  const library = state.game.gameplay?.combo?.library || [];
  const cards = library.map(entry => {
    const selected = state.selectedCombo.includes(entry.key);
    return `<button class="module-pick combo-pick ${selected ? 'selected' : ''}" data-combo-card="${esc(entry.key)}" type="button"><b>${entry.icon} ${esc(comboCardName(entry.key))}</b><small>${esc(entry.tier)}</small></button>`;
  }).join('');
  openSheet(t('dailyCombo'), t('selectThree'),
    `<p class="sheet-description">${t('comboHint')}</p>` +
    `<div class="module-picker combo-picker">${cards}</div>` +
    `<button class="secondary-button" style="margin-top:10px" data-combo-done="true" type="button">${t('submitCombo')} (${state.selectedCombo.length}/3)</button>`);
}

async function openMarketEvent() {
  if (state.actionBusy) return;
  state.actionBusy = true;
  $('marketEvent').classList.add('loading');
  $('marketEvent').setAttribute('aria-busy', 'true');
  try {
    let active = state.game.progression?.incidents?.active;
    if (!active) {
      const response = await api('/api/game/incident/start', { method:'POST', body:{} });
      setGame(response.game);
      active = response.game.progression?.incidents?.active;
      haptic('warning');
    }
    if (!active) return;
    openSheet(t('eventAlert'), active.title || t('marketEvent'), `<p class="sheet-description">${esc(active.description || t('eventChoose'))}</p><p class="sheet-description">${t('eventChoose')}</p><div class="event-options">${(active.options || []).map(option => `<button class="event-option" data-event-action="${esc(option.id)}" type="button"><span><b>${esc(option.label || option.id)}</b><small>${t('energyCost')}: ${fmt(option.energy)} ⚡</small></span><em>+${fmt(option.reward?.data)} I${option.reward?.components ? ` · +${fmt(option.reward.components)} ◆` : ''}</em></button>`).join('')}</div>`);
  } catch (error) { notify(error.message, true); haptic('error'); }
  finally {
    state.actionBusy = false;
    $('marketEvent').classList.remove('loading');
    $('marketEvent').removeAttribute('aria-busy');
  }
}

async function resolveMarketEvent(action) {
  if (state.decisionBusy) return;
  state.decisionBusy = true;
  const buttons = [...document.querySelectorAll('[data-event-action]')];
  buttons.forEach(button => { button.disabled = true; button.classList.add('loading'); });
  try {
    const response = await api('/api/game/incident/resolve', { method:'POST', body:{ action } });
    closeSheet();
    setGame(response.game);
    notify(response.result?.message || t('eventResolved'));
    haptic('success');
  } catch (error) { notify(error.message, true); haptic('error'); }
  finally {
    state.decisionBusy = false;
    buttons.forEach(button => { button.disabled = false; button.classList.remove('loading'); });
  }
}

function toggleComboCard(key) {
  if (state.selectedCombo.includes(key)) state.selectedCombo = state.selectedCombo.filter(item => item !== key);
  else if (state.selectedCombo.length < 3) state.selectedCombo.push(key);
  else state.selectedCombo = [...state.selectedCombo.slice(1), key];
  openComboPicker();
  renderMissions();
}

function resourceInfo(type) {
  const map = {
    intel: [t('intel'), t('resourceIntel'), `${fmt(state.game.resources.productionPerHour)} ${t('income')}`],
    energy: [t('energy'), t('resourceEnergy'), `${fmt(state.game.resources.energyRegenPerHour)}/h`],
    chips: [t('chips'), t('resourceChips'), `${fmt(state.game.resources.components)} ${t('chips')}`]
  };
  const item = map[type];
  openSheet('RESOURCE', item[0], `<p class="sheet-description">${esc(item[1])}</p><div class="metric"><small>${t('networkOnline')}</small><b>${esc(item[2])}</b></div>`);
}

function spawnTapFx(event) {
  const layer = $('tapFx');
  const box = layer.getBoundingClientRect();
  const level = state.scanComboLevel;
  const mult = scanComboMultiplier(level);
  const base = state.game.gameplay?.scan?.tapPower || 1;
  // During the opening boost the floating number reflects the real boosted
  // payout, so tap one already reads huge. Boost taps always render blazing.
  const boostLeft = Number(state.game.gameplay?.scan?.boostTapsLeft || 0) - state.pendingScans;
  const boostMult = boostLeft > 0 ? Number(state.game.gameplay?.scan?.boostMultiplier || 1) : 1;
  const hot = level >= 6 || boostMult > 1;
  const blazing = level >= 12 || boostMult > 1;

  // Anchor everything to the actual touch point so the feedback comes from the
  // finger, not the centre of the radar.
  const x = Math.max(20, Math.min(box.width - 70, (event?.clientX || box.left + box.width / 2) - box.left - 15));
  const y = Math.max(70, Math.min(box.height - 100, (event?.clientY || box.top + box.height / 2) - box.top - 20));

  // Rising +N. It grows and shifts colour as the combo climbs, so a held rhythm
  // is legible at a glance — the number itself is the combo meter.
  const node = document.createElement('span');
  node.className = `tap-number${hot ? ' hot' : ''}${blazing ? ' blazing' : ''}`;
  node.textContent = `+${fmt(Math.round(base * mult * boostMult))}`;
  node.style.left = `${x}px`;
  node.style.top = `${y}px`;
  layer.append(node);
  setTimeout(() => node.remove(), 850);

  if (feel.reduceMotion) return;

  // Shockwave ripple from the touch point — the tactile "hit" the old build
  // lacked. One cheap DOM node, self-removing.
  const ripple = document.createElement('span');
  ripple.className = `tap-ripple${blazing ? ' blazing' : hot ? ' hot' : ''}`;
  ripple.style.left = `${x + 15}px`;
  ripple.style.top = `${y + 20}px`;
  layer.append(ripple);
  setTimeout(() => ripple.remove(), 620);

  // Particle burst — only once the streak is hot, so it reads as a reward for
  // holding the rhythm rather than constant noise. Count scales with heat.
  if (hot) {
    const count = blazing ? 8 : 5;
    for (let i = 0; i < count; i += 1) {
      const p = document.createElement('i');
      p.className = `tap-spark${blazing ? ' blazing' : ''}`;
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const dist = 26 + Math.random() * 30;
      p.style.left = `${x + 15}px`;
      p.style.top = `${y + 20}px`;
      p.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
      p.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
      layer.append(p);
      setTimeout(() => p.remove(), 560);
    }
  }
}

// Client mirror of the server combo curve, for the meter and tap-fx only. The
// server remains the single source of truth for the Intel actually awarded.
const SCAN_COMBO_STEP = 0.05, SCAN_COMBO_MAX = 20;
function scanComboMultiplier(level) { return 1 + Math.min(SCAN_COMBO_MAX, Math.max(0, Number(level) || 0)) * SCAN_COMBO_STEP; }

function updateScanCombo(result) {
  if (!result) return;
  const previous = state.scanComboLevel;
  state.scanComboLevel = Number(result.comboLevel || 0);
  // A distinct chime the moment the streak crosses into hot (6) or blazing (12),
  // marking the threshold the particles and colour shift also key off.
  if ((previous < 6 && state.scanComboLevel >= 6) || (previous < 12 && state.scanComboLevel >= 12)) {
    feel.comboUp();
    haptic('rigid');
  }
  renderScanCombo();
  // The server resets the combo when tapping lapses; mirror that visually so
  // the meter fades out if the player stops, without another round-trip.
  clearTimeout(state.scanComboTimer);
  if (state.scanComboLevel > 0) {
    state.scanComboTimer = setTimeout(() => { state.scanComboLevel = 0; renderScanCombo(); }, 1600);
  }
}

function renderScanCombo() {
  const el = $('scanCombo');
  if (!el) return;
  const level = state.scanComboLevel;
  el.classList.toggle('hidden', level < 1);
  if (level < 1) return;
  const mult = scanComboMultiplier(level);
  $('scanComboMult').textContent = `×${mult.toFixed(1)}`;
  $('scanComboBar').style.width = `${Math.min(100, (level / SCAN_COMBO_MAX) * 100)}%`;
  el.classList.toggle('hot', level >= 12);
}


function queueScan(event) {
  const available = Math.floor(state.game.resources.energy) - state.pendingScans;
  if (available < 1) {
    // Out of energy is a dry tap, not an error: a soft empty click and a light
    // buzz, surfaced at most once every couple of seconds so a player mashing
    // an empty bar isn't spammed with red toasts.
    haptic('warning');
    feel.blip(160, { duration: 0.05, gain: 0.03, type: 'sine' });
    if (!state.lowEnergyToastAt || Date.now() - state.lowEnergyToastAt > 2200) {
      notify(t('resourceEnergy'), true);
      state.lowEnergyToastAt = Date.now();
    }
    return;
  }
  state.pendingScans += 1;
  $('scanButton').classList.remove('scanning');
  void $('scanButton').offsetWidth;
  $('scanButton').classList.add('scanning');
  spawnTapFx(event);
  renderHud();
  renderScanProgress();

  // Audio pitch and haptic strength both track the combo, so faster tapping
  // feels — and sounds — like it's building toward something.
  feel.scan(state.scanComboLevel);
  const level = state.scanComboLevel;
  haptic(level >= 12 ? 'heavy' : level >= 6 ? 'medium' : 'light');

  clearTimeout(state.scanTimer);
  state.scanTimer = setTimeout(flushScans, 420);
}

async function flushScans() {
  if (state.scanBusy || state.pendingScans < 1) return;
  state.scanBusy = true;
  const taps = Math.min(20, state.pendingScans);
  state.pendingScans -= taps;
  try {
    const response = await api('/api/game/scan', { method: 'POST', body: { taps } });
    setGame(response.game);
    updateScanCombo(response.result);
    if (response.result?.discoveredSignal) {
      notify(`${t('newSignalFound')} ${response.result.discoveredSignal.name}`);
      haptic('success');
    }
  } catch (error) {
    state.pendingScans = 0;
    notify(error.message, true);
  } finally {
    state.scanBusy = false;
    if (state.pendingScans > 0) state.scanTimer = setTimeout(flushScans, 160);
  }
}

async function startAction(id) {
  if (state.actionBusy) return;
  state.actionBusy = true;
  $('storyAction').classList.add('loading');
  $('storyAction').setAttribute('aria-busy', 'true');
  try {
    const response = await api('/api/game/action/start', { method:'POST', body:{ actionId:id } });
    setGame(response.game);
    notify(response.game.hero?.job?.label || t('operationRunning'));
    haptic('medium');
  } catch (error) { notify(error.message, true); haptic('error'); }
  finally {
    state.actionBusy = false;
    $('storyAction').classList.remove('loading');
    $('storyAction').removeAttribute('aria-busy');
    if (state.game) renderStoryAction();
  }
}

async function startBuild(id) {
  if (state.actionBusy) return;
  state.actionBusy = true;
  const sourceButton = [...document.querySelectorAll('[data-upgrade]')].find(button => button.dataset.upgrade === id);
  sourceButton?.classList.add('loading');
  sourceButton?.setAttribute('aria-busy', 'true');
  if (sourceButton) sourceButton.disabled = true;
  try {
    const response = await api('/api/game/build', { method:'POST', body:{ roomId:id } });
    setGame(response.game);
    notify(`${moduleCopy(id).name}: ${t('building')}`);
    haptic('medium');
  } catch (error) { notify(error.message, true); haptic('error'); }
  finally {
    state.actionBusy = false;
    sourceButton?.classList.remove('loading');
    sourceButton?.removeAttribute('aria-busy');
    if (sourceButton?.isConnected) sourceButton.disabled = false;
  }
}

/**
 * Pull a live wave when the queue holds no live signals.
 *
 * Nothing in the client ever requested one, so live XRadar signals could not
 * reach a player at all — the bridge was reachable only by hand.
 *
 * The trigger is deliberately "no live signals left", not "queue is empty":
 * onboarding seeds local practice signals and the engine tops them up whenever
 * the queue drains, so an empty queue is a state the player rarely sees. Once
 * the wave lands the condition goes false until those signals are used up, so
 * this does not loop. A cold feed just leaves the practice signals in place.
 */
async function ensureLiveSignals(unlocked, signals) {
  if (!unlocked || !state.config?.liveWaves || state.liveSyncBusy) return;
  if ((signals || []).some(signal => signal.source === 'xradar')) return;
  const now = Date.now();
  if (now - (state.liveSyncAt || 0) < 60_000) return;
  state.liveSyncBusy = true;
  state.liveSyncAt = now;
  try {
    const response = await api('/api/game/recon/sync-live', { method:'POST', body:{} });
    if (response.game) setGame(response.game);
  } catch { /* лента прогревается — остаёмся на локальных сигналах */ }
  finally { state.liveSyncBusy = false; }
}

async function openPositionAction(signalId) {
  if (!state.selectedFactors.length) return notify(t('chooseEvidence'), true);
  if (state.decisionBusy) return;
  state.decisionBusy = true;
  const button = document.querySelector('[data-open-position]');
  if (button) { button.disabled = true; button.classList.add('loading'); }
  try {
    const response = await api('/api/game/positions/open', {
      method:'POST',
      body:{ signalId, stake: state.stake, horizon: state.horizon, factors: state.selectedFactors }
    });
    closeSheet();
    setGame(response.game);
    state.selectedFactors = [];
    state.activeSignalId = null;
    notify(t('posOpened'));
  } catch (error) {
    notify(error.message, true);
    if (button) { button.disabled = false; button.classList.remove('loading'); }
  } finally { state.decisionBusy = false; }
}

async function settlePositionAction(positionId) {
  if (state.settleBusy) return;
  state.settleBusy = true;
  const button = document.querySelector(`[data-settle="${window.CSS?.escape ? CSS.escape(positionId) : positionId}"]`);
  if (button) { button.disabled = true; button.textContent = t('posSettling'); }
  try {
    const response = await api('/api/game/positions/settle', { method:'POST', body:{ positionId } });
    setGame(response.game);
    showPositionResult(response.result);
  } catch (error) {
    notify(error.message, true);
    if (button) { button.disabled = false; button.textContent = t('posSettle'); }
  } finally { state.settleBusy = false; }
}

function showPositionResult(result) {
  state.lastReveal = result.reveal ? { reveal: result.reveal, correct: result.correct } : null;
  const profit = Number(result.profit) || 0;
  const move = `${Number(result.pct) > 0 ? '+' : ''}${result.pct}%`;
  const pnl = `<div class="pnl-row ${profit >= 0 ? 'up' : 'down'}">
    <span><small>${t('posStake')}</small><b>${fmt(result.stake)} I</b></span>
    <span><small>${t('posReturned')}</small><b>${fmt(result.returned)} I</b></span>
    <span><small>${profit >= 0 ? t('posProfit') : t('posLoss')}</small><b>${profit >= 0 ? '+' : ''}${fmt(profit)} I</b></span>
  </div>`;
  const reveal = result.reveal ? revealMarkup(result.reveal, result.correct) : '';
  openSheet(t('posResult'), `${HORIZON_LABEL[result.horizon] || result.horizon} · ${move}`, `${pnl}${reveal}<button class="action-button debrief-continue" data-debrief-close="true" type="button">${t('continue')}</button>`);
}

async function resolveSignalDecision(id, decision) {
  if (!state.selectedFactors.length) return notify(t('chooseEvidence'), true);
  if (state.decisionBusy) return;
  state.decisionBusy = true;
  const buttons = [...document.querySelectorAll('[data-decision]')];
  buttons.forEach(button => { button.disabled = true; button.classList.add('loading'); button.setAttribute('aria-busy', 'true'); });
  try {
    const response = await api('/api/game/recon/resolve', { method:'POST', body:{ signalId:id, decision, factors:state.selectedFactors } });
    closeSheet();
    setGame(response.game);
    showSignalDebrief(response.result);
    state.selectedFactors = [];
    state.activeSignalId = null;
    haptic(response.result.correct ? 'success' : 'warning');
  } catch (error) { notify(error.message, true); haptic('error'); }
  finally {
    state.decisionBusy = false;
    buttons.forEach(button => { button.disabled = false; button.classList.remove('loading'); button.removeAttribute('aria-busy'); });
  }
}

async function submitCombo() {
  if (state.selectedCombo.length !== 3) { openComboPicker(); return; }
  if ($('comboSubmit').classList.contains('loading')) return;
  $('comboSubmit').classList.add('loading');
  $('comboSubmit').disabled = true;
  try {
    const response = await api('/api/game/daily/combo', { method:'POST', body:{ cardKeys:state.selectedCombo } });
    setGame(response.game);
    const result = response.result || {};
    if (result.correct) {
      state.selectedCombo = [];
      closeSheet();
      const sp = Number(result.reward?.signalPoints || 40);
      const mult = Number(result.multiplier || 1);
      notify(`${t('comboSuccess')} ${t('comboRewardLine')(fmt(sp), mult)}`);
      haptic('success');
    } else {
      // Keep the wrong pick visible for a beat, then clear for the next try.
      const matched = Number(result.matchCount || 0);
      state.selectedCombo = [];
      renderMissions();
      const msg = matched > 0 ? t('comboNearMiss')(matched) : t('wrongCombo');
      notify(msg, matched === 0);
      haptic(matched > 0 ? 'light' : 'warning');
    }
  } catch (error) { notify(error.message, true); haptic('error'); }
  finally {
    $('comboSubmit').classList.remove('loading');
    const combo = state.game.gameplay?.combo;
    const blocked = Boolean(combo?.claimed) || Number(combo?.attemptsLeft ?? 3) <= 0;
    if (!blocked) $('comboSubmit').disabled = false;
  }
}

async function shareCombo() {
  try {
    const cards = dailyComboCardLabels();
    const response = await api('/api/growth/combo-share', { method:'POST', body:{} });
    if (response.game) setGame(response.game);
    const url = response.referralUrl;
    const text = t('comboShareText')(cards);
    const telegramShare = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    if (tg?.openTelegramLink) tg.openTelegramLink(telegramShare);
    else if (navigator.share) await navigator.share({ text, url });
    else { await navigator.clipboard.writeText(`${text} ${url}`); notify(t('comboShared')); }
    haptic('success');
  } catch (error) { notify(error.message, true); haptic('error'); }
}

// The solved combo is shareable once claimed; the server reveals the answer
// keys only after a successful claim, so this is empty until then.
function dailyComboCardLabels() {
  const combo = state.game?.gameplay?.combo;
  const keys = (combo?.answer || []).slice(0, 3);
  return keys.map(key => `${comboCardIcon(key)} ${comboCardName(key)}`).join(', ');
}

/* ── Signal Sweep — 30s skill arcade ─────────────────────────────────────────
 * The server owns scoring; this only renders the falling stream it returned,
 * detects taps, and reports { id, atMs } back for authoritative validation.
 * The local score shown during play is cosmetic — the settle response carries
 * the real numbers. Colours: green=safe, amber=alpha bonus, red=rug.
 */
const SWEEP_COLORS = { good: '#65f3ae', bonus: '#ffb400', rug: '#ff5470' };

function openSweep() {
  const sweep = state.game?.gameplay?.sweep;
  $('sweepOverlay').classList.remove('hidden');
  $('sweepOverlay').setAttribute('aria-hidden', 'false');
  showSweepPanel('start');
  const meta = $('sweepMeta');
  const best = Number(sweep?.bestScore || 0);
  meta.innerHTML = `<span>${t('sweepBest')}: <b>${fmt(best)}</b></span><span>SP: <b>${fmt(sweep?.spToday || 0)}/${fmt(sweep?.dailyCap || 0)}</b></span>`;
  const canPlay = Boolean(sweep?.canPlay);
  $('sweepPlay').disabled = !canPlay;
  if (!canPlay) $('sweepPlay').textContent = t('sweepLowEnergy');
}

function closeSweep() {
  stopSweepLoop();
  $('sweepOverlay').classList.add('hidden');
  $('sweepOverlay').setAttribute('aria-hidden', 'true');
  state.sweep = null;
}

function showSweepPanel(which) {
  $('sweepStart').classList.toggle('hidden', which !== 'start');
  $('sweepResult').classList.toggle('hidden', which !== 'result');
  $('sweepCanvas').classList.toggle('playing', which === 'play');
  $('sweepOverlay').querySelector('.sweep-top').classList.toggle('active', which === 'play');
}

async function startSweep() {
  if (state.sweep?.running) return;
  $('sweepPlay').disabled = true; $('sweepAgain').disabled = true;
  try {
    const response = await api('/api/game/sweep/start', { method:'POST', body:{} });
    setGame(response.game);
    const round = response.result;
    beginSweepRound(round);
    haptic('medium');
  } catch (error) {
    notify(error.message, true); haptic('error');
    // Re-enable so the player can retry; a failed start didn't spend anything
    // that a refetch won't reflect.
    $('sweepPlay').disabled = !state.game?.gameplay?.sweep?.canPlay;
    $('sweepAgain').disabled = false;
  }
}

function beginSweepRound(round) {
  const canvas = $('sweepCanvas');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Each spawn gets live render state; hit marks it consumed and records the
  // tap for the server.
  const spawns = round.stream.map(s => ({ ...s, hit: false }));
  state.sweep = {
    running: true,
    roundId: round.roundId,
    durationMs: round.durationMs,
    fallMs: round.fallMs,
    lanes: round.lanes,
    spawns,
    taps: [],
    startTs: performance.now(),
    score: 0,
    combo: 0,
    maxCombo: 0,
    ctx,
    width: rect.width,
    height: rect.height,
    settled: false
  };
  showSweepPanel('play');
  $('sweepScore').textContent = '0';
  $('sweepCombo').textContent = '×0';
  $('sweepTime').textContent = Math.ceil(round.durationMs / 1000);
  state.sweep.raf = requestAnimationFrame(sweepFrame);
}

function stopSweepLoop() {
  if (state.sweep?.raf) cancelAnimationFrame(state.sweep.raf);
  if (state.sweep) state.sweep.running = false;
}

function sweepFrame(now) {
  const s = state.sweep;
  if (!s || !s.running) return;
  const elapsed = now - s.startTs;
  const remaining = Math.max(0, s.durationMs - elapsed);

  const { ctx, width, height, lanes, fallMs } = s;
  ctx.clearRect(0, 0, width, height);

  const laneWidth = width / lanes;
  const radius = Math.min(30, laneWidth * 0.32);
  const topPad = 8;
  const bottomPad = height - 20;

  for (const spawn of s.spawns) {
    if (spawn.hit) continue;
    const age = elapsed - spawn.spawnMs;
    if (age < 0 || age > fallMs) continue;
    const progress = age / fallMs;                       // 0 at top, 1 at bottom
    const x = laneWidth * spawn.lane + laneWidth / 2;
    const y = topPad + progress * (bottomPad - topPad);
    drawSweepNode(ctx, x, y, radius, spawn.type);
    spawn._x = x; spawn._y = y; spawn._r = radius;       // cache for hit test
  }

  // HUD
  $('sweepScore').textContent = fmt(s.score);
  $('sweepCombo').textContent = `×${s.combo}`;
  const secs = Math.ceil(remaining / 1000);
  $('sweepTime').textContent = secs;
  $('sweepTimerBar').style.width = `${(remaining / s.durationMs) * 100}%`;

  if (remaining <= 0) { finishSweep(); return; }
  s.raf = requestAnimationFrame(sweepFrame);
}

function drawSweepNode(ctx, x, y, r, type) {
  const color = SWEEP_COLORS[type] || SWEEP_COLORS.good;
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.16;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = color;
  ctx.stroke();
  // Glyph: ✓ safe, ★ bonus, ✕ rug
  ctx.shadowBlur = 0;
  ctx.fillStyle = color;
  ctx.font = `${Math.round(r * 0.9)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(type === 'rug' ? '✕' : type === 'bonus' ? '★' : '✓', x, y + 1);
  ctx.restore();
}

function onSweepPointer(event) {
  const s = state.sweep;
  if (!s || !s.running) return;
  const rect = $('sweepCanvas').getBoundingClientRect();
  const px = event.clientX - rect.left;
  const py = event.clientY - rect.top;
  const atMs = performance.now() - s.startTs;

  // Nearest live, un-hit spawn under the pointer.
  let target = null; let bestDist = Infinity;
  for (const spawn of s.spawns) {
    if (spawn.hit || spawn._x == null) continue;
    const age = atMs - spawn.spawnMs;
    if (age < 0 || age > s.fallMs) continue;
    const dx = px - spawn._x, dy = py - spawn._y;
    const dist = Math.hypot(dx, dy);
    if (dist <= spawn._r * 1.35 && dist < bestDist) { bestDist = dist; target = spawn; }
  }
  if (!target) return;

  target.hit = true;
  s.taps.push({ id: target.id, atMs });

  // Burst is positioned in viewport coordinates so it sits on the tapped node.
  const burstX = rect.left + target._x;
  const burstY = rect.top + target._y;

  // Cosmetic local scoring + feedback; server is authoritative on settle.
  if (target.type === 'rug') {
    s.combo = 0;
    s.score = Math.max(0, s.score - 25);
    haptic('error');
    spawnSweepBurst(burstX, burstY, SWEEP_COLORS.rug);
  } else {
    const base = target.type === 'bonus' ? 40 : 10;
    s.score += base + Math.min(10, s.combo) * 2;
    s.combo += 1;
    s.maxCombo = Math.max(s.maxCombo, s.combo);
    haptic(target.type === 'bonus' ? 'success' : 'light');
    spawnSweepBurst(burstX, burstY, SWEEP_COLORS[target.type]);
  }
}

// Lightweight tap burst at viewport coordinates.
function spawnSweepBurst(x, y, color) {
  if (!state.sweep) return;
  const el = document.createElement('span');
  el.className = 'sweep-burst';
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.setProperty('--burst', color);
  $('sweepOverlay').appendChild(el);
  setTimeout(() => el.remove(), 360);
}

async function finishSweep() {
  const s = state.sweep;
  if (!s || s.settled) return;
  s.settled = true;
  s.running = false;
  stopSweepLoop();
  try {
    const response = await api('/api/game/sweep/settle', { method:'POST', body:{ roundId: s.roundId, taps: s.taps } });
    setGame(response.game);
    showSweepResult(response.result);
    haptic('success');
  } catch (error) {
    notify(error.message, true); haptic('error');
    showSweepPanel('start');
  }
}

function showSweepResult(result) {
  showSweepPanel('result');
  $('sweepResultScore').textContent = fmt(result.score);
  $('sweepResultBreakdown').innerHTML = [
    `<span>${t('sweepGoods')}: <b>${fmt(result.goods)}</b></span>`,
    `<span>${t('sweepRugs')}: <b>${fmt(result.rugs)}</b></span>`,
    `<span>${t('sweepMaxCombo')}: <b>×${fmt(result.maxCombo)}</b></span>`,
    `<span>${t('sweepBest')}: <b>${fmt(result.bestScore)}</b></span>`
  ].join('');
  const cap = Number(result.spToday) >= Number(result.dailyCap);
  $('sweepResultReward').textContent = t('sweepReward')(result.signalPoints);
  $('sweepResultReward').classList.toggle('muted', result.signalPoints <= 0);
  if (cap && result.signalPoints <= 0) notify(t('sweepCapReached'));
  const canPlay = Boolean(state.game?.gameplay?.sweep?.canPlay);
  $('sweepAgain').disabled = !canPlay;
  if (!canPlay) $('sweepAgain').textContent = t('sweepLowEnergy');
  else $('sweepAgain').textContent = t('sweepAgain');
}

async function submitCipher() {
  const code = $('cipherInput').value.trim();
  if (code.length !== 5) return notify(t('cipherWrong'), true);
  if ($('cipherSubmit').classList.contains('loading')) return;
  $('cipherSubmit').classList.add('loading');
  $('cipherSubmit').disabled = true;
  try {
    const response = await api('/api/game/daily/cipher', { method:'POST', body:{ code } });
    $('cipherInput').value = '';
    setGame(response.game);
    notify(t('cipherSuccess'));
    haptic('success');
  } catch { notify(t('cipherWrong'), true); haptic('error'); }
  finally { $('cipherSubmit').classList.remove('loading'); if (!state.game.gameplay?.cipher?.claimed) $('cipherSubmit').disabled = false; }
}

async function saveLanguage(language) {
  if (!['en','ru'].includes(language) || language === state.language) return;
  try {
    const response = await api('/api/game/profile/language', { method:'POST', body:{ language } });
    state.language = language;
    setGame(response.game);
    notify(t('languageSaved'));
  } catch (error) { notify(error.message, true); }
}

async function connectReferral() {
  const code = $('referralInput').value.trim();
  if (!code) return;
  try {
    const response = await api('/api/game/referral/connect', { method:'POST', body:{ code, deviceId:deviceId() } });
    setGame(response.game);
    notify(t('connected'));
  } catch (error) { notify(error.message, true); }
}

async function shareReferral(mode = 'chat') {
  try {
    const response = await api('/api/growth/share', { method:'POST', body:{} });
    if (response.game) setGame(response.game);
    const url = response.referralUrl;
    const number = Number(response.game?.progression?.growth?.genesis?.number || 0);
    const score = Number(response.game?.gameplay?.airdrop?.total || 0);
    // The pitch closes with what the recipient gets. A share that only brags
    // about the sender's score asks for a favour; naming the starting package
    // makes it an offer, and it is the one line that survives being forwarded.
    const rates = response.game?.progression?.referralRewards || state.game?.progression?.referralRewards;
    const boast = number ? t('genesisShareText')(number, fmt(score)) : t('genesisPendingShareText')(fmt(score));
    const text = rates
      ? `${boast}\n\n${t('shareBonusLine')(fmt(rates.welcome.data), fmt(rates.welcome.components))}`
      : boast;
    if (mode === 'story' && tg?.shareToStory && state.config?.genesisStoryUrl) {
      tg.shareToStory(state.config.genesisStoryUrl, { text, widget_link:{ url, name:'Join XRadar' } });
      return;
    }
    const telegramShare = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    if (tg?.openTelegramLink) tg.openTelegramLink(telegramShare);
    else if (navigator.share) await navigator.share({ text, url });
    else { await navigator.clipboard.writeText(url); notify(t('copied')); }
  } catch (error) { notify(error.message, true); }
}

// A mint deep-links straight to that token in the terminal, which is the whole
// point of the reveal: the player lands on the chart they just judged.
// Open the XRadar terminal. When XRADAR_BOT_URL is configured we open the
// terminal *bot* as a Mini App inside Telegram (openTelegramLink keeps the user
// in-app), passing the mint as the bot's startapp payload. Without a bot URL we
// fall back to the plain website in an external browser, so older deploys that
// only set XRADAR_BASE_URL keep working unchanged.
// Normalise a t.me / bot URL into an absolute https link. Accepts
// "t.me/RadarTradeBot", "@RadarTradeBot", "RadarTradeBot" or a full
// "https://t.me/RadarTradeBot" and always returns an https://t.me/... form
// (or null if there's nothing usable). openTelegramLink silently rejects
// anything that isn't a proper t.me URL, which is the usual reason a bot link
// "falls back to the website".
function normalizeTelegramLink(raw) {
  let value = String(raw || '').trim();
  if (!value) return null;
  if (value.startsWith('@')) value = value.slice(1);
  if (/^https?:\/\//i.test(value)) {
    value = value.replace(/^http:\/\//i, 'https://');
    if (/(^|\.)t\.me\//i.test(value)) return value;    // already a t.me link
    return value;                                       // some other https URL
  }
  // Bare "t.me/Bot" or just "Bot"
  value = value.replace(/^t\.me\//i, '');
  return `https://t.me/${value}`;
}

function openXradar(mint = '') {
  const botLink = normalizeTelegramLink(state.config?.xradarBotUrl);
  const webUrl = state.config?.xradarBaseUrl;
  if (!botLink && !webUrl) return notify(t('notConfigured'), true);
  void api('/api/growth/xradar-open', { method:'POST', body:{} }).catch(() => {});

  // Prefer the Telegram bot deep link whenever we have one and we're inside
  // Telegram. openTelegramLink keeps the user in-app; the mint rides in as the
  // Mini App startapp payload.
  const isTmeLink = botLink && /^https:\/\/t\.me\//i.test(botLink);
  if (isTmeLink && tg?.openTelegramLink) {
    const sep = botLink.includes('?') ? '&' : '?';
    const link = mint ? `${botLink}${sep}startapp=mint_${encodeURIComponent(mint)}` : botLink;
    try { tg.openTelegramLink(link); return; }
    catch (error) { console.warn('[xradar] openTelegramLink failed, falling back to web:', error); }
  }

  const base = webUrl || botLink;
  const url = mint ? `${base}${base.includes('?') ? '&' : '?'}mint=${encodeURIComponent(mint)}` : base;
  try { if (tg?.openLink) tg.openLink(url); else window.open(url, '_blank', 'noopener'); }
  catch { window.open(url, '_blank', 'noopener'); }
}

// Sharing a call carries the player's own referral link, so a good reveal
// recruits the next operator instead of just being a screenshot.
async function shareSignalCall() {
  const snapshot = state.lastReveal;
  if (!snapshot) return;
  try {
    const response = await api('/api/growth/share', { method:'POST', body:{} });
    if (response.game) setGame(response.game);
    const url = response.referralUrl;
    const value = Number(snapshot.reveal.actualPct || 0);
    const move = `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
    const text = t('revealShareText')(snapshot.reveal.symbol, move, snapshot.correct);
    const telegramShare = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    if (tg?.openTelegramLink) tg.openTelegramLink(telegramShare);
    else if (navigator.share) await navigator.share({ text, url });
    else { await navigator.clipboard.writeText(url); notify(t('copied')); }
  } catch (error) { notify(error.message, true); }
}

/**
 * First-session welcome — the Blum-style intro that opens the very first
 * session and tells a brand-new operator what the game is in three lines. It's
 * gated on a server flag (progression.onboarding.welcomeSeen), so it shows once
 * and a reload never replays it. It reuses the shared #modal and defers behind
 * the return-report/genesis modals if one of those is already up, so the player
 * never gets two overlapping intros.
 */
function renderWelcome() {
  const onboarding = state.game?.progression?.onboarding;
  if (!onboarding || onboarding.welcomeSeen) return;
  // Don't stack on top of another modal already on screen; try again on the
  // next render once it's dismissed.
  if (!$('modal').classList.contains('hidden')) return;

  $('modalKicker').textContent = t('welcomeKicker');
  $('modalTitle').textContent = t('welcomeTitle');
  // The three bullets are the whole pitch, so the body carries markup here.
  // Every other modal path overwrites modalText with textContent, so this
  // innerHTML can't leak into them.
  $('modalText').innerHTML = `<span class="welcome-lead">${esc(t('welcomeBody'))}</span>`
    + '<ul class="welcome-steps">'
    + `<li>${esc(t('welcomeBullet1'))}</li>`
    + `<li>${esc(t('welcomeBullet2'))}</li>`
    + `<li>${esc(t('welcomeBullet3'))}</li>`
    + '</ul>';
  $('modalButton').textContent = t('welcomeCta');
  $('modalButton').dataset.action = 'ack-welcome';
  $('modal').querySelector('.modal-card').classList.remove('modal-reward');
  $('modal').classList.remove('hidden');
  feel.reward();
  haptic('success');
}

async function acknowledgeWelcome() {
  // Hide immediately for a responsive feel; the server call persists the flag.
  $('modal').classList.add('hidden');
  try {
    const response = await api('/api/game/welcome/ack', { method:'POST', body:{} });
    setGame(response.game);
  } catch (error) { notify(error.message, true); }
  // Land the new operator on the radar with the tap loop front and centre.
  setScreen('radar');
}

function renderReturnReport() {
  const report = state.game.progression?.returnReport;
  if (!report || $('modal').dataset.reportShown === String(report.createdAt || 'shown')) return;
  // Only celebrate a return worth celebrating — a sub-minute reload shouldn't
  // pop a "welcome back" modal.
  if (Number(report.data || 0) < 1) return;
  $('modal').dataset.reportShown = String(report.createdAt || 'shown');
  $('modalKicker').textContent = t('reportKicker');
  // Lead with the earned Intel as the headline — the big number is the reward,
  // the way Hamster/Blum open a session with "you earned X while away".
  $('modalTitle').textContent = `+${fmt(Math.round(report.data))}`;
  $('modalText').textContent = t('reportText')(Number(report.hours || 0).toFixed(1));
  $('modalButton').textContent = t('collect');
  $('modalButton').dataset.action = 'ack-report';
  $('modal').classList.remove('hidden');
  $('modal').querySelector('.modal-card').classList.add('modal-reward');
  feel.reward();
  haptic('success');
}

function renderGenesisClaim() {
  const number = Number(state.game?.progression?.growth?.genesis?.number || 0);
  if (!number) return;
  const storageKey = `xradar-genesis-shown-${number}`;
  try { if (localStorage.getItem(storageKey)) return; localStorage.setItem(storageKey, '1'); } catch {}
  $('modalKicker').textContent = t('genesisKicker');
  $('modalTitle').textContent = t('genesisModalTitle');
  $('modalText').textContent = t('genesisModalText')(number);
  $('modalButton').textContent = t('shareResult');
  $('modalButton').dataset.action = 'genesis-share';
  $('modal').querySelector('.modal-card').classList.remove('modal-reward');
  $('modal').classList.remove('hidden');
  haptic('success');
}

async function acknowledgeReport() {
  try {
    const response = await api('/api/game/report/ack', { method:'POST', body:{} });
    $('modal').classList.add('hidden');
    $('modal').querySelector('.modal-card').classList.remove('modal-reward');
    setGame(response.game);
  } catch (error) { notify(error.message, true); }
}

function handleStoryAction() {
  const button = $('storyAction');
  if (button.dataset.kind === 'action') startAction(button.dataset.value);
  else if (button.dataset.kind === 'build') { setScreen('upgrades'); startBuild(button.dataset.value); }
  else if (button.dataset.kind === 'screen') setScreen(button.dataset.value);
  else setScreen('missions');
}

function schedulePoll() {
  clearTimeout(state.pollTimer);
  const jobs = [state.game?.hero?.job, state.game?.progression?.secondaryJob].filter(Boolean);
  const remaining = jobs.length ? Math.min(...jobs.map(job => Number(job.remainingMs || 0))) : null;
  const delay = remaining === null ? 45_000 : Math.min(45_000, Math.max(1_500, remaining + 250));
  state.pollTimer = setTimeout(refresh, delay);
}

async function refresh() {
  try { const response = await api('/api/game'); setGame(response.game); } catch { schedulePoll(); }
}

function deviceId() {
  let id = localStorage.getItem('xradar-device-id');
  if (!id) { id = crypto.randomUUID?.() || Math.random().toString(36).slice(2); localStorage.setItem('xradar-device-id', id); }
  return id;
}

async function enterGame() {
  const response = await api('/api/game');
  $('auth').classList.add('hidden');
  $('game').classList.remove('hidden');
  document.body.classList.add('radar-active');
  setGame(response.game);
  void maybeHandleTribeInvite();
  // Initialise TonConnect on entry, not on button press. The SDK restores a
  // previous wallet session asynchronously and fires onStatusChange with the
  // account, so a wallet the player connected earlier shows up in the game
  // immediately instead of staying invisible until they tap Connect again.
  try { tonConnectInstance(); } catch {}
}

// If the app was opened from a tribe invite (startapp=tribe_CODE or ?tribe=CODE)
// and the player is not already in a tribe, jump them to the Network screen and
// prefill the join field so the invite converts in one tap.
async function maybeHandleTribeInvite() {
  try {
    const search = new URLSearchParams(location.search);
    const raw = tg?.initDataUnsafe?.start_param || search.get('startapp') || search.get('tribe') || '';
    const match = /^tribe[_-]([A-Za-z0-9]{4,8})$/.exec(String(raw));
    const code = match ? match[1].toUpperCase() : (search.get('tribe') || '').toUpperCase();
    if (!code) return;
    if (state.game?.gameplay?.tribe?.inTribe) return; // already in one
    setScreen('network');
    await refreshTribeData(true);
    const input = $('tribeJoinInput');
    if (input) { input.value = code; input.focus(); }
    notify(t('tribeJoinPrefilled'));
  } catch {}
}

async function authenticate(body) {
  const search = new URLSearchParams(location.search);
  const source = search.get('src');
  const startParam = tg?.initDataUnsafe?.start_param || search.get('startapp') || search.get('ref') || (source ? `SRC_${source}` : '');
  await api('/api/auth/telegram', { method:'POST', body:{ ...body, deviceId:deviceId(), startParam } });
  await enterGame();
}

// Telegram owns the viewport, and svh does not track it. Two things went wrong
// without this: the shell sat at the wrong height because 100svh measures the
// WebView rather than the Mini App's visible area, and every burst of taps on
// the radar was read as a vertical swipe, so Telegram dragged the whole app.
function syncTelegramViewport() {
  if (!tg) return;
  const apply = () => {
    // stableHeight ignores the transient height while the sheet is dragged —
    // using plain viewportHeight here is what makes the layout jitter.
    const h = tg.viewportStableHeight || tg.viewportHeight;
    if (h) document.documentElement.style.setProperty('--app-height', `${h}px`);
  };
  apply();
  try { tg.onEvent?.('viewportChanged', apply); } catch {}
  // Bot API 7.7+. Without it the drag-to-close gesture fires on rapid tapping.
  try { tg.disableVerticalSwipes?.(); } catch {}
}

async function boot() {
  try { tg?.ready?.(); tg?.expand?.(); } catch {}
  const splash = $('splash'); if (splash) splash.dataset.shownAt = String(performance.now());
  syncTelegramViewport();
  applyLanguage();
  try {
    state.config = await api('/api/config');
    const launch = await api('/api/launch/status').catch(() => null);
    state.launch = launch?.launch || null;
    try { await enterGame(); return; } catch {}
    if (tg?.initData) { await authenticate({ initData:tg.initData }); return; }
    if (state.config.allowDevAuth) {
      $('authButton').classList.remove('hidden');
      $('authStatus').textContent = state.language === 'ru' ? 'Локальный режим готов' : 'Local simulation ready';
      return;
    }
    $('authStatus').textContent = state.language === 'ru' ? 'Открой игру внутри Telegram' : 'Open the game inside Telegram';
  } catch (error) { $('authStatus').textContent = error.message; }
  finally { dismissSplash(); }
}

// The splash paints from HTML before any JS runs; we hold it a beat so the
// logo animation reads, then fade it out once boot has resolved a path.
function dismissSplash() {
  const splash = $('splash');
  if (!splash || splash.classList.contains('gone')) return;
  const start = Number(splash.dataset.shownAt || 0) || performance.now();
  const held = performance.now() - start;
  const wait = Math.max(0, 900 - held); // minimum on-screen time
  setTimeout(() => {
    splash.classList.add('gone');
    setTimeout(() => splash.remove(), 500);
  }, wait);
}

document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.screen) return setScreen(button.dataset.screen);
  if (button.dataset.signal) return openSignal(button.dataset.signal);
  if (button.dataset.upgrade) return startBuild(button.dataset.upgrade);
  if (button.dataset.decision) return resolveSignalDecision(button.dataset.signalId, button.dataset.decision);
  if (button.dataset.factor) return toggleEvidenceFactor(button.dataset.factor);
  if (button.dataset.openPosition) return openPositionAction(button.dataset.openPosition);
  if (button.dataset.settle) return settlePositionAction(button.dataset.settle);
  if (button.dataset.stake) { state.stake = Number(button.dataset.stake); return openSignal(state.activeSignalId); }
  if (button.dataset.horizon) { state.horizon = button.dataset.horizon; return openSignal(state.activeSignalId); }
  if (button.hasAttribute('data-reveal-open')) return openXradar(button.dataset.revealOpen);
  if (button.dataset.revealShare) return shareSignalCall();
  if (button.dataset.conversionClaim) return claimConversion();
  if (button.dataset.tradeSync) return syncTrading();
  if (button.dataset.mbuy) return marketTrade(button.dataset.mbuy, 'buy');
  if (button.dataset.msell) return marketTrade(button.dataset.msell, 'sell');
  if (button.dataset.mredeem) return marketTrade(button.dataset.mredeem, 'redeem');
  if (button.id === 'mCreateBtn') return createMarketAction();
  if (button.dataset.termtab) {
    // Terminal hosts two panels: the XRadar funnel and player markets.
    state.termTab = button.dataset.termtab;
    document.querySelectorAll('[data-termtab]').forEach(tab => tab.classList.toggle('active', tab === button));
    $('termPanelXradar').hidden = state.termTab !== 'xradar';
    $('termPanelMarkets').hidden = state.termTab !== 'markets';
    if (state.termTab === 'markets') { void refreshMarkets(); void refreshMarketCreators(); }
    haptic('light');
    return;
  }
  if (button.dataset.msort) {
    state.marketSort = button.dataset.msort;
    document.querySelectorAll('[data-msort]').forEach(tab => tab.classList.toggle('active', tab === button));
    void refreshMarkets(true);
    return;
  }
  if (button.dataset.buy) return buyProduct(button.dataset.buy, button.dataset.method || 'stars');
  if (button.dataset.lootbox) return openLootbox(button.dataset.lootbox);
  if (button.hasAttribute('data-wallet-connect')) return connectWalletAction();
  if (button.hasAttribute('data-wallet-disconnect')) return disconnectWalletAction();
  if (button.dataset.questGo) return questGo(button.dataset.questGo);
  if (button.dataset.questClaim) return questClaim(button.dataset.questClaim);
  if (button.dataset.lesson) return openLesson(button.dataset.lesson);
  if (button.dataset.lessonAnswer != null) return answerLesson(button.dataset.lessonId, Number(button.dataset.lessonAnswer));
  if (button.dataset.lessonClose) { closeSheet(); renderMissions(); return; }
  if (button.dataset.equip) return equipGear(button.dataset.equip);
  if (button.dataset.debriefClose) { closeSheet(); setScreen(state.game.progression?.recon?.signals?.length ? 'signals' : 'radar'); return; }
  if (button.dataset.eventAction) return resolveMarketEvent(button.dataset.eventAction);
  if (button.dataset.comboPicker) return openComboPicker();
  if (button.dataset.comboCard) return toggleComboCard(button.dataset.comboCard);
  if (button.dataset.comboDone) { closeSheet(); renderMissions(); return; }
  if (button.dataset.faction) { state.tribeFaction = button.dataset.faction; openTribeCreate(); return; }
  if (button.dataset.tribeCreateConfirm) return createTribe();
  if (button.dataset.language) return saveLanguage(button.dataset.language);
  if (button.dataset.shareMode) return shareReferral(button.dataset.shareMode);
  if (button.dataset.story) return handleStoryAction();
  if (button.dataset.resource) return resourceInfo(button.dataset.resource);
});

$('authButton').addEventListener('click', async () => {
  if ($('authButton').classList.contains('loading')) return;
  $('authButton').classList.add('loading');
  $('authButton').disabled = true;
  try { await authenticate({ dev:true }); }
  catch (error) { $('authStatus').textContent = error.message; notify(error.message, true); }
  finally { $('authButton').classList.remove('loading'); $('authButton').disabled = false; }
});
// Autoplay policy: an AudioContext created before a user gesture starts
// suspended. Warm it on the first pointer/keydown anywhere, once, so the very
// first tap already makes sound instead of the one after it.
{
  const warmAudio = () => { feel.ensure(); if (feel.ctx?.state === 'suspended') feel.ctx.resume().catch(() => {}); };
  window.addEventListener('pointerdown', warmAudio, { once: true, passive: true });
  window.addEventListener('keydown', warmAudio, { once: true });
}
$('scanButton').addEventListener('pointerdown', queueScan);
$('tapHeadLeague').addEventListener('click', () => { haptic('select'); setScreen('profile'); });
$('marketEvent').addEventListener('click', openMarketEvent);
$('storyAction').addEventListener('click', handleStoryAction);
$('signalQueue').addEventListener('click', () => setScreen('signals'));
$('comboShortcut').addEventListener('click', () => setScreen('missions'));
$('streakBadge').addEventListener('click', () => setScreen('missions'));
$('spHero').addEventListener('click', () => setScreen('network'));
$('farmClaim').addEventListener('click', claimFarm);
$('spinButton').addEventListener('click', doSpin);
$('sweepShortcut').addEventListener('click', openSweep);
$('sweepClose').addEventListener('click', closeSweep);
$('sweepExit').addEventListener('click', closeSweep);
$('sweepPlay').addEventListener('click', startSweep);
$('sweepAgain').addEventListener('click', startSweep);
$('sweepCanvas').addEventListener('pointerdown', onSweepPointer);
$('airdropShortcut').addEventListener('click', () => setScreen('network'));
$('leagueButton').addEventListener('click', () => setScreen('network'));
$('sheetClose').addEventListener('click', closeSheet);
$('comboSubmit').addEventListener('click', submitCombo);
$('comboShare').addEventListener('click', shareCombo);
$('cipherSubmit').addEventListener('click', submitCipher);
$('connectReferral').addEventListener('click', connectReferral);
$('shareReferral').addEventListener('click', () => shareReferral('chat'));
$('openXradar').addEventListener('click', openXradar);
$('modalButton').addEventListener('click', () => {
  if ($('modalButton').dataset.action === 'ack-welcome') acknowledgeWelcome();
  if ($('modalButton').dataset.action === 'ack-report') acknowledgeReport();
  if ($('modalButton').dataset.action === 'genesis-share') { $('modal').classList.add('hidden'); shareReferral('chat'); }
});

document.addEventListener('keydown', event => { if (event.key === 'Escape' && state.sheet) closeSheet(); });

window.addEventListener('beforeunload', () => { if (state.pendingScans) flushScans(); });
boot();
