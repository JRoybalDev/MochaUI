import os
import subprocess
import cloudinary
import cloudinary.uploader
from google.cloud import storage

# Load .env file if it exists (fallback for when env vars aren't passed from Node.js)
def load_env_file():
    env_path = os.path.join(os.path.dirname(__file__), '../../.env')
    if os.path.exists(env_path):
        try:
            with open(env_path, 'r') as f:
                for line in f:
                    line = line.strip()
                    if '=' in line and not line.startswith('#') and line:
                        key, value = line.split('=', 1)
                        # Only set if not already set (prioritize passed env vars)
                        if key not in os.environ:
                            os.environ[key] = value.strip('"\'')
        except Exception as e:
            import sys
            print(f"[DEBUG] Could not load .env file: {e}", file=sys.stderr)

# Load environment variables
load_env_file()

# Configure Cloudinary
cloudinary.config(
    cloud_name=os.getenv('CLOUDINARY_CLOUD_NAME'),
    api_key=os.getenv('CLOUDINARY_API_KEY'),
    api_secret=os.getenv('CLOUDINARY_API_SECRET')
)

def process_and_upload_video(local_video_path):
  """
  Downloads, compresses, and uploads a video to Cloudinary CDN.
  Returns the CDN URL of the uploaded video.
  """
  import sys
  print(f"[DEBUG] Starting video processing for: {local_video_path}", file=sys.stderr)

  # Validate input file
  if not os.path.exists(local_video_path):
    raise FileNotFoundError(f"Input video file not found: {local_video_path}")

  file_size = os.path.getsize(local_video_path)
  print(f"[DEBUG] Input file size: {file_size} bytes", file=sys.stderr)

  if file_size == 0:
    raise ValueError(f"Input video file is empty: {local_video_path}")

  # Check file headers for basic format validation
  with open(local_video_path, 'rb') as f:
    header = f.read(32)
    print(f"[DEBUG] File header (first 32 bytes): {header[:16].hex()} ...", file=sys.stderr)

    # Check for common video format signatures
    if header.startswith(b'\x00\x00\x00'):
      print(f"[DEBUG] Appears to be MP4/MOV format (ftyp box detected)", file=sys.stderr)
    elif header.startswith(b'RIFF'):
      print(f"[DEBUG] Appears to be AVI format", file=sys.stderr)
    else:
      print(f"[DEBUG] Unknown format or potentially corrupted header", file=sys.stderr)

  # Quick validation using ffprobe
  ffprobe_bin = os.path.join(os.path.dirname(__file__), '../bin/ffprobe')
  if os.path.exists(ffprobe_bin):
    try:
      # First try with detailed output to see what ffprobe thinks
      probe_cmd_detailed = [ffprobe_bin, '-v', 'error', '-show_format', '-show_streams', local_video_path]
      probe_result = subprocess.run(probe_cmd_detailed, capture_output=True, text=True, timeout=10)

      if probe_result.returncode != 0:
        print(f"[WARNING] ffprobe detected issues with video file (exit code: {probe_result.returncode})", file=sys.stderr)
        print(f"[WARNING] ffprobe stderr: {probe_result.stderr.strip()}", file=sys.stderr)
        print(f"[WARNING] This file may be corrupted or have metadata issues", file=sys.stderr)
      else:
        print(f"[DEBUG] ffprobe validation successful", file=sys.stderr)
        # Try to extract basic info
        if "Duration:" in probe_result.stdout or "format_name" in probe_result.stdout:
          print(f"[DEBUG] File appears to have valid video metadata", file=sys.stderr)
    except (subprocess.TimeoutExpired, FileNotFoundError, PermissionError) as e:
      print(f"[DEBUG] ffprobe validation skipped ({type(e).__name__}: {e})", file=sys.stderr)

  compressed_path = local_video_path.replace('.mp4', '_compressed.mp4')
  print(f"[DEBUG] Compressed video will be saved to: {compressed_path}", file=sys.stderr)
  ffmpeg_bin = os.path.join(os.path.dirname(__file__), '../bin/ffmpeg')  # Check if this is an AV1 video that might need special handling
  is_av1_video = False
  if os.path.exists(ffprobe_bin):
    try:
      codec_check = subprocess.run([ffprobe_bin, '-v', 'quiet', '-select_streams', 'v:0', '-show_entries', 'stream=codec_name', '-of', 'csv=p=0', local_video_path], capture_output=True, text=True)
      if codec_check.returncode == 0 and 'av1' in codec_check.stdout.lower():
        is_av1_video = True
        print(f"[DEBUG] Detected AV1 video codec", file=sys.stderr)
    except:
      pass

  # First, try with appropriate decoding options
  if is_av1_video:
    # For AV1 videos, force software decoding and add specific options
    compress_cmd = [
      ffmpeg_bin,
      '-hwaccel', 'none',  # Force software decoding
      '-i', local_video_path,
      '-c:v', 'libx264',  # Output codec
      '-crf', '28',
      '-preset', 'medium',  # Slower but more compatible for AV1
      '-c:a', 'aac',  # Audio codec
      '-movflags', '+faststart',  # Web optimization
      '-pix_fmt', 'yuv420p',  # Ensure compatibility
      compressed_path
    ]
  else:
    # Standard compression for other codecs
    compress_cmd = [
      ffmpeg_bin, '-i', local_video_path,
      '-c:v', 'libx264',  # Output codec
      '-crf', '28',
      '-preset', 'fast',
      '-c:a', 'aac',  # Audio codec
      '-movflags', '+faststart',  # Web optimization
      '-pix_fmt', 'yuv420p',  # Ensure compatibility
      compressed_path
    ]

  print(f"[DEBUG] Running ffmpeg command: {' '.join(compress_cmd)}", file=sys.stderr)

  try:
    subprocess.run(compress_cmd, check=True, stderr=subprocess.PIPE, stdout=subprocess.PIPE)
    print(f"[DEBUG] FFmpeg compression completed successfully", file=sys.stderr)
  except subprocess.CalledProcessError as e:
    print(f"[DEBUG] FFmpeg failed with standard command, trying fallback options", file=sys.stderr)
    print(f"[DEBUG] FFmpeg error: {e.stderr.decode() if e.stderr else 'No error details'}", file=sys.stderr)

    # Check if this is an AV1 decoding issue
    stderr_content = e.stderr.decode() if e.stderr else ''
    if ('doesn\'t support hardware accelerated AV1 decoding' in stderr_content or
        'Error submitting packet to decoder' in stderr_content or
        'Failed to get pixel format' in stderr_content):
      print(f"[DEBUG] Detected AV1 codec issues, trying alternative decoding approach", file=sys.stderr)

      # AV1-specific fallback with different options
      try:
        av1_fallback_cmd = [
          ffmpeg_bin,
          '-threads', '1',  # Single thread for stability
          '-hwaccel', 'none',  # Force software decoding
          '-i', local_video_path,
          '-c:v', 'libx264',
          '-crf', '28',
          '-preset', 'ultrafast',  # Fastest preset for problematic AV1
          '-c:a', 'aac',
          '-ac', '2',  # Force stereo
          '-ar', '44100',  # Force sample rate
          '-movflags', '+faststart',
          '-pix_fmt', 'yuv420p',
          '-avoid_negative_ts', 'make_zero',
          '-max_muxing_queue_size', '1024',
          compressed_path
        ]
        print(f"[DEBUG] Attempting AV1 fallback: {' '.join(av1_fallback_cmd)}", file=sys.stderr)
        subprocess.run(av1_fallback_cmd, check=True)
        print(f"[DEBUG] AV1 fallback compression successful", file=sys.stderr)
        return  # Success, exit the exception handler
      except subprocess.CalledProcessError:
        print(f"[DEBUG] AV1 fallback failed, trying standard repair approaches", file=sys.stderr)

    # Check if this looks like a metadata corruption issue or missing moov atom
    elif ('contradictionary STSC and STCO' in stderr_content or
          'error reading header' in stderr_content or
          'moov atom not found' in stderr_content):
      if 'moov atom not found' in stderr_content:
        print(f"[DEBUG] Detected missing moov atom (incomplete download), trying recovery", file=sys.stderr)
        # For missing moov atom, try to scan for streams and rebuild metadata
        recovery_cmd = [
          ffmpeg_bin, '-analyzeduration', '2147483647', '-probesize', '2147483647',
          '-i', local_video_path,
          '-c:v', 'libx264', '-crf', '28', '-preset', 'ultrafast',
          '-c:a', 'aac', '-movflags', '+faststart',
          '-f', 'mp4', '-y',  # Force overwrite
          compressed_path
        ]
        try:
          print(f"[DEBUG] Attempting moov atom recovery: {' '.join(recovery_cmd)}", file=sys.stderr)
          subprocess.run(recovery_cmd, check=True)
          print(f"[DEBUG] Moov atom recovery successful", file=sys.stderr)
          return  # Success, exit the exception handler
        except subprocess.CalledProcessError:
          print(f"[DEBUG] Moov atom recovery failed, file may be too corrupted", file=sys.stderr)
      else:
        print(f"[DEBUG] Detected MP4 metadata corruption, trying container remux first", file=sys.stderr)

        # Try to remux the container without re-encoding to fix metadata
        try:
          remux_path = local_video_path.replace('.mp4', '_remuxed.mp4')
          remux_cmd = [
            ffmpeg_bin, '-i', local_video_path,
            '-c', 'copy',  # Copy streams without re-encoding
            '-avoid_negative_ts', 'make_zero',
            '-fflags', '+genpts',
            '-map_metadata', '-1',  # Strip problematic metadata
            remux_path
          ]
          print(f"[DEBUG] Attempting container remux: {' '.join(remux_cmd)}", file=sys.stderr)
          subprocess.run(remux_cmd, check=True, stderr=subprocess.PIPE, stdout=subprocess.PIPE)

          # Now try to compress the remuxed file
          remux_compress_cmd = [
            ffmpeg_bin, '-i', remux_path,
            '-c:v', 'libx264', '-crf', '28', '-preset', 'fast',
            '-c:a', 'aac', '-movflags', '+faststart', '-pix_fmt', 'yuv420p',
            compressed_path
          ]
          print(f"[DEBUG] Compressing remuxed file: {' '.join(remux_compress_cmd)}", file=sys.stderr)
          subprocess.run(remux_compress_cmd, check=True)

          # Clean up remuxed file
          os.remove(remux_path)
          print(f"[DEBUG] Container remux and compression successful", file=sys.stderr)
          # If we get here, the remux worked, so we can skip other fallbacks
          return  # Exit the except block successfully

        except subprocess.CalledProcessError:
          print(f"[DEBUG] Container remux failed, trying repair approach", file=sys.stderr)
        # Continue to the repair fallback below

    # First fallback: try to repair the file and then compress
    try:
      repair_cmd = [
        ffmpeg_bin, '-err_detect', 'ignore_err', '-i', local_video_path,
        '-c', 'copy', '-f', 'mp4',
        local_video_path.replace('.mp4', '_repaired.mp4')
      ]
      print(f"[DEBUG] Attempting to repair video: {' '.join(repair_cmd)}", file=sys.stderr)
      subprocess.run(repair_cmd, check=True, stderr=subprocess.PIPE, stdout=subprocess.PIPE)

      # Now try to compress the repaired file
      repaired_path = local_video_path.replace('.mp4', '_repaired.mp4')
      repair_compress_cmd = [
        ffmpeg_bin, '-i', repaired_path,
        '-c:v', 'libx264',
        '-crf', '28',
        '-preset', 'fast',
        '-c:a', 'aac',
        '-movflags', '+faststart',
        '-pix_fmt', 'yuv420p',
        compressed_path
      ]
      print(f"[DEBUG] Compressing repaired video: {' '.join(repair_compress_cmd)}", file=sys.stderr)
      subprocess.run(repair_compress_cmd, check=True)

      # Clean up repaired file
      os.remove(repaired_path)
      print(f"[DEBUG] Video repair and compression successful", file=sys.stderr)

    except subprocess.CalledProcessError:
      print(f"[DEBUG] Video repair failed, trying aggressive fallback", file=sys.stderr)

      # Last resort: aggressive compatibility options
      fallback_cmd = [
        ffmpeg_bin, '-err_detect', 'ignore_err', '-i', local_video_path,
        '-c:v', 'libx264',
        '-crf', '28',
        '-preset', 'ultrafast',
        '-c:a', 'aac',
        '-movflags', '+faststart',
        '-pix_fmt', 'yuv420p',
        '-avoid_negative_ts', 'make_zero',
        '-fflags', '+genpts+discardcorrupt',
        '-max_muxing_queue_size', '1024',
        '-fps_mode', 'cfr',  # Constant frame rate (updated from deprecated -vsync)
        compressed_path
      ]

      print(f"[DEBUG] Running aggressive fallback: {' '.join(fallback_cmd)}", file=sys.stderr)
      try:
        subprocess.run(fallback_cmd, check=True)
      except subprocess.CalledProcessError:
        print(f"[DEBUG] Aggressive fallback failed, trying raw stream extraction", file=sys.stderr)

        # Final attempt: try to extract raw streams and rebuild
        raw_extract_cmd = [
          ffmpeg_bin, '-analyzeduration', '2147483647', '-probesize', '2147483647',
          '-err_detect', 'ignore_err', '-i', local_video_path,
          '-map', '0', '-ignore_unknown',
          '-c:v', 'libx264', '-crf', '28', '-preset', 'ultrafast',
          '-c:a', 'aac', '-ac', '2', '-ar', '44100',
          '-pix_fmt', 'yuv420p',
          '-f', 'mp4', '-movflags', '+faststart',
          '-avoid_negative_ts', 'make_zero',
          '-fflags', '+genpts+discardcorrupt+igndts',
          '-fps_mode', 'cfr',
          '-max_muxing_queue_size', '4096',
          '-max_interleave_delta', '0',
          compressed_path
        ]

        print(f"[DEBUG] Attempting raw stream extraction: {' '.join(raw_extract_cmd)}", file=sys.stderr)
        try:
          subprocess.run(raw_extract_cmd, check=True)
        except subprocess.CalledProcessError as final_error:
          print(f"[ERROR] All video repair attempts failed. File appears to be completely corrupted.", file=sys.stderr)
          print(f"[ERROR] Final error: {final_error.stderr.decode() if hasattr(final_error, 'stderr') and final_error.stderr else 'No details available'}", file=sys.stderr)

          # Check if this is a seed operation and we should skip this file
          file_name = os.path.basename(local_video_path)
          if '_seed.mp4' in file_name:
            print(f"[WARNING] Skipping corrupted seed file: {file_name}", file=sys.stderr)
            # Return a placeholder or None to indicate failure
            raise ValueError(f"Video file {file_name} is corrupted and cannot be processed. Consider removing it from the seed data.")
          else:
            # Re-raise the error for non-seed files
            raise
  # Check file size before uploading
  file_size = os.path.getsize(compressed_path)
  print(f"[DEBUG] Compressed file size: {file_size} bytes", file=sys.stderr)
  max_size = 100 * 1024 * 1024  # 100MB in bytes
  if file_size > max_size:
    # Debug print for file existence
    print(f"[DEBUG] Checking file existence: {compressed_path} (exists: {os.path.isfile(compressed_path)})", file=sys.stderr)
    # Ensure file exists before uploading
    if not os.path.isfile(compressed_path):
      print(f"[ERROR] File not found for large video handling: {compressed_path}", file=sys.stderr)
      raise FileNotFoundError(f"File not found: {compressed_path}")
    # Check environment - check multiple possible env vars and production indicators
    env = os.getenv('NODE_ENV') or os.getenv('ENVIRONMENT') or os.getenv('ENV') or 'development'

    # Also check for production indicators
    database_url = os.getenv('DATABASE_URL', '')
    is_prod_db = 'prisma.io' in database_url or 'postgres://' in database_url

    print(f"[DEBUG] NODE_ENV from env: {os.getenv('NODE_ENV')}", file=sys.stderr)
    print(f"[DEBUG] Environment detected: {env}", file=sys.stderr)
    print(f"[DEBUG] Database URL contains production indicators: {is_prod_db}", file=sys.stderr)

    # Force production if we detect production database
    if is_prod_db and env != 'production':
        env = 'production'
        print(f"[DEBUG] Overriding environment to production based on database", file=sys.stderr)

    if env == 'production':
      # Upload to Google Cloud Storage
      gcs_url = upload_video_to_gcs(compressed_path, bucket_name='mochlist', folder='videos')
      print(f"[DEBUG] File too large for Cloudinary. Uploaded to GCS: {gcs_url}", file=sys.stderr)
      return gcs_url
    else:
      # Save to /public/videos in development
      import shutil
      videos_dir = os.path.join(os.path.dirname(__file__), '../../public/videos')
      os.makedirs(videos_dir, exist_ok=True)
      dest_path = os.path.join(videos_dir, os.path.basename(compressed_path))
      shutil.move(compressed_path, dest_path)
      public_path = f"/videos/{os.path.basename(compressed_path)}"
      print(f"[DEBUG] Moved large video to: {dest_path}", file=sys.stderr)
      print(f"[DEBUG] Returning public path: {public_path}", file=sys.stderr)
      return public_path
  try:
    response = cloudinary.uploader.upload(
      compressed_path,
      resource_type="video",
      folder="PlaylistViewer"
    )
    print(f"[DEBUG] Cloudinary upload response: {response}", file=sys.stderr)
    os.remove(compressed_path)
    print(f"[DEBUG] Removed temporary compressed file: {compressed_path}", file=sys.stderr)
    return response['secure_url']
  except Exception as e:
    import shutil
    err_str = str(e)
    print(f"[DEBUG] Cloudinary upload failed: {err_str}", file=sys.stderr)
    # If error is 413 or mentions 'Entity Too Large', move file to /public/videos
    if '413' in err_str or 'Entity Too Large' in err_str:
      videos_dir = os.path.join(os.path.dirname(__file__), '../../public/videos')
      os.makedirs(videos_dir, exist_ok=True)
      dest_path = os.path.join(videos_dir, os.path.basename(compressed_path))
      shutil.move(compressed_path, dest_path)
      public_path = f"/videos/{os.path.basename(compressed_path)}"
      print(f"[DEBUG] Moved large video to: {dest_path}", file=sys.stderr)
      print(f"[DEBUG] Returning public path for large file fallback: {public_path}", file=sys.stderr)
      return public_path
    else:
      # Clean up temp file if not a size error
      os.remove(compressed_path)
      print(f"[DEBUG] Removed temporary compressed file: {compressed_path}", file=sys.stderr)
      raise

def upload_video_to_gcs(local_path, bucket_name='mochlist', folder='videos'):
    """
    Uploads a local file to Google Cloud Storage and returns the public URL.
    """
    import sys
    print(f"[DEBUG] Starting upload_video_to_gcs for: {local_path}", file=sys.stderr)
    print(f"[DEBUG] Checking file existence: {local_path} (exists: {os.path.isfile(local_path)})", file=sys.stderr)
    if not os.path.isfile(local_path):
        print(f"[ERROR] File not found: {local_path}", file=sys.stderr)
        raise FileNotFoundError(f"File not found: {local_path}")
    try:
        print(f"[DEBUG] Initializing GCS client...", file=sys.stderr)
        client = storage.Client()
        print(f"[DEBUG] Getting bucket: {bucket_name}", file=sys.stderr)
        bucket = client.bucket(bucket_name)
        blob_name = os.path.basename(local_path)
        print(f"[DEBUG] Creating blob: {blob_name}", file=sys.stderr)
        blob = bucket.blob(blob_name)
        print(f"[DEBUG] Uploading file to GCS...", file=sys.stderr)
        blob.upload_from_filename(local_path)
        public_url = blob.public_url
        print(f"[DEBUG] Uploaded to GCS. Public URL: {public_url}", file=sys.stderr)
        return public_url
    except Exception as e:
        print(f"[ERROR] Exception during GCS upload: {e}", file=sys.stderr)
        raise

if __name__ == "__main__":
  import sys
  try:
    if len(sys.argv) < 2:
      print("Usage: python video_cdn_helper.py <video_path>", file=sys.stderr)
      sys.exit(1)
    video_path = sys.argv[1]
    print(f"[DEBUG] Video CDN Helper v2.1 - Updated FFmpeg commands", file=sys.stderr)
    print(f"[DEBUG] Input video path: {video_path}", file=sys.stderr)
    url = process_and_upload_video(video_path)
    print(f"[DEBUG] Final URL to return: {url}", file=sys.stderr)
    print(url)
  except Exception as e:
    error_message = str(e)
    print(f"Error: {error_message}", file=sys.stderr)

    # Use specific exit codes for different types of errors
    if "corrupted and cannot be processed" in error_message:
      sys.exit(3)  # Exit code 3 for corrupted files
    else:
      sys.exit(2)  # Exit code 2 for other errors
