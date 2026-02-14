
'use client';

const sounds = {
  turn: 'https://assets.mixkit.co/active_storage/sfx/2861/2861-preview.mp3', // Notification ping
  throw: 'https://assets.mixkit.co/active_storage/sfx/261/261-preview.mp3',   // Quick snap/whoosh
  draw: 'https://assets.mixkit.co/active_storage/sfx/2056/2056-preview.mp3',  // Paper slide
  boom: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',  // Explosion
};

export const playSound = (type: keyof typeof sounds) => {
  if (typeof window === 'undefined') return;
  const audio = new Audio(sounds[type]);
  audio.volume = 0.5;
  audio.play().catch(e => console.log('Audio play blocked by browser policy'));
};
