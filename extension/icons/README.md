# Extension Icons

Place your extension icons in this directory:

- `icon16.png` - 16x16 pixels (toolbar icon)
- `icon48.png` - 48x48 pixels (extension management page)
- `icon128.png` - 128x128 pixels (Chrome Web Store)

You can generate simple placeholder icons using ImageMagick:

```bash
# Create a simple red gradient icon
convert -size 128x128 gradient:red-darkred -fill white -pointsize 60 -gravity center -annotate +0+0 "🛒" icon128.png
convert icon128.png -resize 48x48 icon48.png
convert icon128.png -resize 16x16 icon16.png
```

Or create them manually using any image editor.

