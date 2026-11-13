/* =============================================================================
   Supreme Dark RP - website settings. This is the only file you need to edit.
   See SETUP.md for the free hosting + database setup (about 15 minutes).
   ============================================================================= */
window.SUPREME_CONFIG = {

  // ---- Database (Supabase, free). Leave both empty to run in DEMO MODE:
  // demo mode keeps posts only in your own browser, so you can try everything first.
  // Supabase > Project Settings > API: "Project URL" and the "anon public" key.
  supabaseUrl: '',
  supabaseAnonKey: '',

  // ---- Server info
  siteName: 'Supreme Dark RP',
  tagline: 'Garry\'s Mod DarkRP. Gangs, drugs, casino, knife cases and a city that never sleeps.',
  serverIP: '100.10.56.244:27015',   // shown on the site with a "Join server" button
  discordInvite: '',                 // e.g. 'https://discord.gg/abc123' (leave '' to hide the button)

  // ---- Donations. Ko-fi is free and takes no cut of donations: https://ko-fi.com
  // Put your Ko-fi (or PayPal.me) link here. Leave '' to show "coming soon".
  donateURL: '',

  // ---- Staff applications
  applicationsOpen: true,

  // ---- Forum boards. The ids must match the list in supabase_setup.sql
  // (search for "category in"). staffOnly = only staff can start threads there.
  categories: [
    { id: 'updates',     group: 'Supreme Dark RP', name: 'Updates & Announcements', icon: '📢', staffOnly: true,
      desc: 'Patch notes, new features and server news.' },
    { id: 'events',      group: 'Supreme Dark RP', name: 'Server Events', icon: '🎉', staffOnly: true,
      desc: 'Purge nights, casino tournaments, giveaways. Reply to say you\'re coming.' },
    { id: 'general',     group: 'Community', name: 'General Discussion', icon: '💬',
      desc: 'Talk about anything Supreme: RP stories, gangs, the economy.' },
    { id: 'suggestions', group: 'Community', name: 'Suggestions', icon: '💡',
      desc: 'Ideas for jobs, addons, maps and changes.' },
    { id: 'media',       group: 'Community', name: 'Screenshots & Clips', icon: '🎬',
      desc: 'Show off your base, your knife pulls and your best moments.' },
    { id: 'offtopic',    group: 'Community', name: 'Off-Topic', icon: '🎮',
      desc: 'Anything that isn\'t about the server.' },
    { id: 'support',     group: 'Support', name: 'Help & Bug Reports', icon: '🛠️',
      desc: 'Something broken? Lost items? Ask here.' },
    { id: 'appeals',     group: 'Support', name: 'Ban Appeals & Player Reports', icon: '⚖️',
      desc: 'Appeal a ban or report a rule breaker. Include SteamIDs and proof.' },
  ],

  // ---- Donation ranks (same as the in-game F4 > Donate list, supreme_ranks addon)
  ranks: [
    { id: 'e2access', name: 'E2 Access', price: 5, color: '#3cc8e6', perks: [
      'Expression 2 (Wiremod chips)', 'Cyan [E2] chat tag', 'E2 badge on the forums' ] },
    { id: 'vip', name: 'VIP', price: 10, color: '#f5be28', perks: [
      'VIP jobs: VIP Citizen, VIP Hitman, VIP Arms Dealer, Pro Thief, Osama, Kermit, Bouncy Yaris, Batman, SWAT Sniper/Medic/Chief',
      'VIP items in the F4 shop', 'Gold [VIP] chat tag', '60 props (instead of 40)',
      'Reserved slot when the server is full', 'VIP badge on the forums' ] },
    { id: 'supremevip', name: 'Supreme VIP', price: 25, color: '#ff465a', best: true, rainbow: true, perks: [
      'Everything in VIP', 'Expression 2 access', 'Animated rainbow [Supreme VIP] chat tag', '80 props',
      'Animated Supreme VIP badge on the forums' ] },
  ],

  // ---- Staff application questions. type: text | number | long
  applicationQuestions: [
    { id: 'ign', label: 'In-game name', type: 'text', required: true },
    { id: 'steam', label: 'SteamID (type "status" in the game console, or look it up on steamid.io)', type: 'text', required: true, fromProfile: 'steam_id', placeholder: 'STEAM_0:1:12345678' },
    { id: 'discord', label: 'Discord username', type: 'text', required: true },
    { id: 'age', label: 'Age', type: 'number', required: true },
    { id: 'tz', label: 'Timezone', type: 'text', required: true, placeholder: 'e.g. EST' },
    { id: 'hours', label: 'Hours per week you can be on the server', type: 'number', required: true },
    { id: 'playtime', label: 'How long have you played on Supreme?', type: 'text', required: true },
    { id: 'exp', label: 'Past staff experience (which servers, what rank, how long)', type: 'long' },
    { id: 'why', label: 'Why do you want to be staff here?', type: 'long', required: true },
    { id: 'rdm', label: 'Scenario: someone is killing people at spawn for no reason (RDM). Walk us through what you do.', type: 'long', required: true },
    { id: 'friend', label: 'Scenario: your friend breaks a rule right in front of you. What do you do?', type: 'long', required: true },
    { id: 'sit', label: 'Scenario: two players report each other and there is no proof either way. How do you handle it?', type: 'long', required: true },
    { id: 'extra', label: 'Anything else we should know?', type: 'long' },
  ],
};
