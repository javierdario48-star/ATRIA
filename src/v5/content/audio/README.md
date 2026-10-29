# ATRIA supplied audio

- `atria-theme.m4a`: byte-identical copy of the supplied `ATRIA_A_piano.wav (Remix) (1).m4a` (the input MP4 contains Opus). Original speed, stereo channels, 48 kHz, complete end padding and entire composition retained. Approximately 164.4 seconds, 2.94 MB. Primary browser download.
- `atria-theme-aac.m4a`: 192 kbps AAC fallback with fast-start MP4 metadata for browsers that cannot decode Opus. Approximately 4 MB; downloaded only after the primary format fails.
- `atria-click.wav`: byte-identical copy of `ATRIA_click_navegacion-1.wav`, stereo 44.1 kHz PCM, 190 ms. No pitch, timbre or speed changes.

Music is decoded once per application lifetime, looped sample-accurately by Web Audio without timer scheduling, and receives a 128-frame (about 2.7 ms) de-click envelope at each boundary in memory. No part of the composition is trimmed, no silence is appended, and the primary stored file is unmodified. The source has a naturally quiet ending; it is retained.

The primary and click are copied directly. The fallback is prepared with FFmpeg using `-c:a aac -b:a 192k -movflags +faststart` and its metadata removed. Both variants are delivered by the existing canonical builder's content-directory copying. A trial Ogg remux was rejected because the muxer discarded 13.5 ms of original trailing Opus padding.
