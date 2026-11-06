# Job media folders

Keep project media beside the job manifest under these folders:

- Images: jobs/assets/ — PNG, JPG, JPEG, WEBP.
- Audio: jobs/audio/ — MP3, WAV, M4A, OGG, AAC, FLAC.

Example manifest fragment:

    {
      "voiceover_file": "audio/voiceover.mp3",
      "music_file": "audio/music-bed.mp3",
      "music_volume": 0.14,
      "scenes": [
        {
          "title": "Opening",
          "narration": "The opening line shown on screen.",
          "visual": "Wide establishing shot; cool dawn light.",
          "image_file": "assets/opening.webp",
          "camera_move": "push_in",
          "seconds": 8
        }
      ]
    }

Allowed camera movements: static, push_in, pull_out, pan_left, pan_right, pan_up and pan_down.

Media files are not downloaded by the renderer. They must be committed before running the workflow. Paths are relative to the jobs folder. The renderer rejects traversal, unsupported extensions and symlink escapes.

Only upload material you own or are permitted to use. The repository is public; never commit private voice recordings, personal photos, secrets or copyrighted material without redistribution rights.
