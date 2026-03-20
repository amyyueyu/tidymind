export const LEVEL_BADGES: Record<number, {
  title: string;
  subtitle: string;
  emoji: string;
  shareTagline: string;
}> = {
  1:  { title: 'Chaos Observer',    emoji: '👀', subtitle: 'I noticed the mess. That counts.', shareTagline: 'I noticed my room was messy. Growth.' },
  2:  { title: 'One Thing Done',    emoji: '✅', subtitle: 'Picked one thing up. Kept going.', shareTagline: 'I did one thing and then another thing.' },
  3:  { title: 'Floor Whisperer',   emoji: '🧹', subtitle: 'The floor has been seen.', shareTagline: 'You can see my floor now. I am changed.' },
  4:  { title: 'Pile Negotiator',   emoji: '📦', subtitle: 'Moved things from one pile to a better pile.', shareTagline: 'Professionally relocated my clutter.' },
  5:  { title: 'Surface Revealer',  emoji: '✨', subtitle: 'A desk was discovered beneath the chaos.', shareTagline: 'Archaeologist. Found a desk under there.' },
  6:  { title: 'Dopamine Farmer',   emoji: '🌱', subtitle: 'Completing tasks for the rush.', shareTagline: 'Found the cheat code for my brain.' },
  7:  { title: 'Executive Function (Borrowed)', emoji: '🧠', subtitle: 'Operating at full borrowed capacity.', shareTagline: 'Borrowed some executive function. Returned it tidy.' },
  8:  { title: 'ADHD Mythbuster',   emoji: '💥', subtitle: 'Turns out you can do the thing.', shareTagline: 'Plot twist: I cleaned my room.' },
  9:  { title: 'Chaos Tamer',       emoji: '🦁', subtitle: 'The mess respects you now.', shareTagline: 'The clutter fears me.' },
  10: { title: 'TidyMate Legend',   emoji: '🏆', subtitle: 'You are the main character.', shareTagline: 'Main character era. Room is clean.' },
};

export function getBadgeForLevel(level: number) {
  return LEVEL_BADGES[Math.min(level, 10)] ?? LEVEL_BADGES[10];
}
