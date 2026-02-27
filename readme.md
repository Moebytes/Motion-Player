## Motion Player

<img src="assets/images/readme.png">

A simple video player app.

### Features:
- Play local videos, links, and YouTube videos (MP4, MKV, MOV, AVI, WEBM, M4V)
- Play local audio and links (MP3, WAV, OGG)
- Adjust the volume of the video
- Reversing effect
- Time stretching (can preserve or affect the pitch)
- Apply video filters (brightness, contrast, saturation, pixelate, etc).
- Looping from point A to point B
- Enter full-screen mode
- Export videos with applied effects

### Keyboard Shortcuts:
- Space: Play/pause
- Left Arrow: Rewind
- Right Arrow: Fast forward
- Up Arrow: Increase volume
- Down Arrow: Decrease volume
- Mouse Wheel: Increase/decrease volume
- Ctrl O: Upload file
- Ctrl S: Download file

### Node.js

Downloading YouTube videos will require Node.js. You must install it separately: https://nodejs.org/en

### Design

Our design is available here: https://www.figma.com/design/PpYPQAYojONPWedMbDRL8t/Motion-Player 

### Installation

Download from [releases](https://github.com/Moebytes/Motion-Player/releases).

### MacOS

On MacOS unsigned applications won't open, run this to remove the quarantine flag.
```
xattr -d com.apple.quarantine "/Applications/Motion Player.app"
```

### See Also

- [Tune Player](https://github.com/Moebytes/Tune-Player)
- [Pic Viewer](https://github.com/Moebytes/Pic-Viewer)


