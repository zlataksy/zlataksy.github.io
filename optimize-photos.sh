#!/bin/bash
set -e;

# Configuration
INPUT_DIR="inputPhotos"
OUTPUT_DIR="outputPhotos"

echo "Starting photo optimization..."
echo "Input: $INPUT_DIR"
echo "Output: $OUTPUT_DIR (WebP, max width 550px)"

EXTENSIONS=("jpg" "jpeg" "png" "gif" "webp" "JPG" "JPEG" "PNG" "GIF" "WEBP")

count=0

for ext in "${EXTENSIONS[@]}"; do
    for f in "$INPUT_DIR"/*."$ext"; do
        [ -e "$f" ] || continue

        filename=$(basename "$f")
        basename="${filename%.*}"
        output_file="$OUTPUT_DIR/${basename}.webp"

        if [ -f "$output_file" ]; then
            echo "Skipping $filename (optimized version already exists)"
            continue
        fi

        echo "Processing $filename..."

        ffmpeg -i "$f" \
               -vf "scale='min(550,iw)':-1:flags=lanczos" \
               -frames:v 1 \
               -c:v libwebp \
               -compression_level 6 \
               -q:v 75 \
               "$output_file" -y

        if [ $? -eq 0 ]; then
            echo "Successfully optimized: $filename -> ${basename}.webp"
            count=$((count + 1))
        else
            echo "Error processing: $filename"
        fi
    done
done

echo "Done! Optimized $count photos."
