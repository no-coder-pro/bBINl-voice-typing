from PIL import Image, ImageOps
import os

source_path = r"C:\Users\no coder pro\.gemini\antigravity\brain\8b72b374-da71-4e0d-9ffc-c36f1157fbe6\voice_typing_adaptive_icon_v2_1769856659082.png"
output_dir = r"C:\Users\no coder pro\Downloads\bBINl-voice-typing-main\icons"
logo_output = r"C:\Users\no coder pro\Downloads\bBINl-voice-typing-main\icons\logo.png"

if not os.path.exists(source_path):
    print(f"Error: Source image not found at {source_path}")
    exit(1)

# Open image
img = Image.open(source_path).convert("RGBA")

# 1. Background to Transparent (Simple approach: white to transparent)
datas = img.getdata()
newData = []
for item in datas:
    # If pixel is very close to white, make it transparent
    if item[0] > 240 and item[1] > 240 and item[2] > 240:
        newData.append((255, 255, 255, 0))
    else:
        newData.append(item)
img.putdata(newData)

# 2. Crop to bounding box of non-transparent pixels
bbox = img.getbbox()
if bbox:
    img = img.crop(bbox)

# 3. Add a small padding (1px) to prevent cutting edges
img = ImageOps.expand(img, border=2, fill=(255, 255, 255, 0))

# 4. Save as master logo.png
img.save(logo_output)
print(f"Saved Master logo: {logo_output}")

# 5. Resize to standard icons
sizes = [16, 48, 128]
for size in sizes:
    # Maintain aspect ratio while fitting in square
    res = img.copy()
    res.thumbnail((size, size), Image.Resampling.LANCZOS)
    
    # Create background square and paste thumbnail in center
    final = Image.new("RGBA", (size, size), (255, 255, 255, 0))
    offs = ((size - res.size[0]) // 2, (size - res.size[1]) // 2)
    final.paste(res, offs)
    
    output_file = os.path.join(output_dir, f"icon{size}.png")
    final.save(output_file)
    print(f"Saved: {output_file}")
    
    # Overwrite state-specific icons
    if size == 48:
        for suffix in ["_active", "_listening", "_error"]:
            state_file = os.path.join(output_dir, f"icon48{suffix}.png")
            final.save(state_file)
            print(f"Saved: {state_file}")
