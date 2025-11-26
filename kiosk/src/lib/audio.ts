type SoundType = 'success' | 'error' | 'scan';

const sounds: Record<SoundType, HTMLAudioElement | null> = {
  success: null,
  error: null,
  scan: null,
};

// Preload audio files
export function initAudio(): void {
  sounds.success = new Audio('/sounds/success.mp3');
  sounds.error = new Audio('/sounds/error.mp3');
  sounds.scan = new Audio('/sounds/scan.mp3');

  // Set volume
  Object.values(sounds).forEach((audio) => {
    if (audio) {
      audio.volume = 0.6;
    }
  });
}

export function playSound(type: SoundType): void {
  const audio = sounds[type];
  if (audio) {
    audio.currentTime = 0;
    audio.play().catch((err) => {
      console.warn(`Failed to play ${type} sound:`, err);
    });
  }
}

export function setVolume(volume: number): void {
  const clampedVolume = Math.max(0, Math.min(1, volume));
  Object.values(sounds).forEach((audio) => {
    if (audio) {
      audio.volume = clampedVolume;
    }
  });
}
