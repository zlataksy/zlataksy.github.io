#!/bin/bash

# Configuration
INPUT_DIR="inputVideos"
OUTPUT_DIR="outputVideos"

# Ensure output directory exists (redundant since user created it, but good practice)
mkdir -p "$OUTPUT_DIR"

echo "Starting video optimization..."
echo "Input: $INPUT_DIR"
echo "Output: $OUTPUT_DIR"

# Supported extensions
EXTENSIONS=("mov" "mp4" "mkv" "MOV" "MP4" "MKV")

count=0

for ext in "${EXTENSIONS[@]}"; do
    for f in "$INPUT_DIR"/*."$ext"; do
        # Check if file exists (needed because glob might return the pattern if no files match)
        [ -e "$f" ] || continue
        
        filename=$(basename "$f")
        basename="${filename%.*}"
        output_file="$OUTPUT_DIR/${basename}.mp4"
        
        if [ -f "$output_file" ]; then
            echo "Skipping $filename (optimized version already exists)"
            continue
        fi
        
        echo "Processing $filename..."
        
        ffmpeg -i "$f" \
               -vcodec libx264 \
               -crf 24 \
               -preset slow \
               -pix_fmt yuv420p \
               -movflags +faststart \
               -acodec aac \
               -b:a 128k \
               "$output_file" -y
        
        if [ $? -eq 0 ]; then
            echo "Successfully optimized: $filename -> ${basename}.mp4"
            count=$((count + 1))
        else
            echo "Error processing: $filename"
        fi
    done
done

echo "Done! Optimized $count videos."
