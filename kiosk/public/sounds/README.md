# Kiosk Sound Files

This directory contains audio feedback files for the kiosk interface.

## Required Files

- `success.mp3` - Played when check-in/check-out is successful
- `error.mp3` - Played when an error occurs
- `scan.mp3` - Played when badge scanning starts (optional)

## File Specifications

- **Format**: MP3 (for broad browser compatibility)
- **Duration**: 0.5-2 seconds (short and clear)
- **Volume**: Normalized to prevent clipping
- **Bit Rate**: 128 kbps or higher

## Recommendations

- Use distinct, easily recognizable sounds
- Keep sounds brief to avoid delaying user experience
- Test on Raspberry Pi hardware to ensure acceptable playback
- Consider accessibility - sounds should be supplementary to visual feedback

## Sound Sources

You can generate or find suitable sounds from:
- [Freesound.org](https://freesound.org) (Creative Commons licensed sounds)
- [Zapsplat](https://www.zapsplat.com) (Free sound effects)
- Generate custom sounds using audio editing software

## Note

Currently, placeholder files are used. Replace with actual audio files before deployment.
