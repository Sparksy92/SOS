#!/usr/bin/env python3
import os
import sys
import subprocess
import json
import re

# Simple .env parser to avoid python-dotenv dependency
def load_env(env_path):
    env_vars = {}
    if os.path.exists(env_path):
        try:
            with open(env_path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith('#'):
                        continue
                    if '=' in line:
                        k, v = line.split('=', 1)
                        # Strip optional quotes
                        val = v.strip().strip('"').strip("'")
                        env_vars[k.strip()] = val
        except Exception as e:
            print(f"Error loading env file: {e}")
    return env_vars

def get_ytdlp_executable():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    venv_ytdlp = os.path.join(project_root, 'venv', 'bin', 'yt-dlp')
    if os.path.exists(venv_ytdlp):
        return venv_ytdlp
    venv_ytdlp_win = os.path.join(project_root, 'venv', 'Scripts', 'yt-dlp.exe')
    if os.path.exists(venv_ytdlp_win):
        return venv_ytdlp_win
    return 'yt-dlp'

def check_dependencies():
    deps = {'yt-dlp': False, 'ffmpeg': False}
    ytdlp = get_ytdlp_executable()
    try:
        subprocess.run([ytdlp, '--version'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        deps['yt-dlp'] = True
    except FileNotFoundError:
        pass

    try:
        subprocess.run(['ffmpeg', '-version'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        deps['ffmpeg'] = True
    except FileNotFoundError:
        pass
    return deps

def search_youtube(query, limit=10):
    print(f"\n🔍 Searching YouTube for: '{query}'...")
    ytdlp = get_ytdlp_executable()
    cmd = [
        ytdlp,
        '--flat-playlist',
        '--playlist-end', str(limit),
        '--dump-single-json',
        f"ytsearch{limit}:{query}"
    ]
    try:
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
        data = json.loads(result.stdout)
        return data.get('entries', [])
    except Exception as e:
        print(f"❌ Search failed: {e}")
        return []

def format_duration(seconds):
    if seconds is None:
        return "Unknown"
    seconds = int(seconds)
    mins = seconds // 60
    secs = seconds % 60
    hours = mins // 60
    mins = mins % 60
    if hours > 0:
        return f"{hours}:{mins:02d}:{secs:02d}"
    return f"{mins}:{secs:02d}"

def download_video(url, target_dir, has_ffmpeg):
    os.makedirs(target_dir, exist_ok=True)
    
    # If we don't have ffmpeg, choose best pre-merged mp4 format to avoid merging error.
    # If we have ffmpeg, download the best mp4 format and merge high quality streams.
    format_opt = "best[ext=mp4]/best" if not has_ffmpeg else "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best"
    ytdlp = get_ytdlp_executable()
    
    cmd = [
        ytdlp,
        '-f', format_opt,
        '-o', os.path.join(target_dir, '%(title)s.%(ext)s'),
        '--write-info-json',
        '--no-playlist',
        '--progress',
        url
    ]
    
    print(f"\n📥 Launching download: {url}")
    print(f"📂 Saving to: {target_dir}")
    print(f"⚙️ Format query: {format_opt}")
    
    # Renders stdout directly to terminal so operator sees real-time progress
    try:
        process = subprocess.Popen(cmd, stdout=sys.stdout, stderr=sys.stderr)
        process.communicate()
        if process.returncode == 0:
            print("✔ Download completed successfully!")
            return True
        else:
            print(f"❌ Download failed with exit code: {process.returncode}")
            return False
    except KeyboardInterrupt:
        print("\n🛑 Download cancelled by operator.")
        return False
    except Exception as e:
        print(f"❌ Error executing download: {e}")
        return False

def download_channel(channel_url, target_dir, has_ffmpeg, limit=None):
    os.makedirs(target_dir, exist_ok=True)
    format_opt = "best[ext=mp4]/best" if not has_ffmpeg else "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best"
    ytdlp = get_ytdlp_executable()
    
    cmd = [
        ytdlp,
        '-f', format_opt,
        '-o', os.path.join(target_dir, '%(title)s.%(ext)s'),
        '--write-info-json',
        '--progress',
    ]
    
    if limit is not None:
        cmd.extend(['--playlist-end', str(limit)])
        print(f"\n📥 Downloading latest {limit} videos from channel: {channel_url}")
    else:
        print(f"\n📥 Downloading ALL videos from channel: {channel_url}")
        
    cmd.append(channel_url)
    print(f"📂 Saving to: {target_dir}")
    
    try:
        process = subprocess.Popen(cmd, stdout=sys.stdout, stderr=sys.stderr)
        process.communicate()
        if process.returncode == 0:
            print("✔ Channel download completed successfully!")
            return True
        else:
            print(f"❌ Channel download failed with exit code: {process.returncode}")
            return False
    except KeyboardInterrupt:
        print("\n🛑 Channel download cancelled by operator.")
        return False
    except Exception as e:
        print(f"❌ Error executing channel download: {e}")
        return False

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    
    env = load_env(os.path.join(project_root, '.env'))
    materials_dir = env.get('SOS_MATERIALS_DIR', project_root)
    materials_dir = os.path.abspath(materials_dir)
    
    if not os.path.exists(materials_dir):
        fallback = os.path.join(project_root, 'materials')
        print(f"⚠️ Warning: Configured path '{materials_dir}' does not exist.")
        print(f"🔄 Falling back to local materials folder: '{fallback}'")
        materials_dir = fallback
        os.makedirs(materials_dir, exist_ok=True)
        
    # Check dependencies
    deps = check_dependencies()
    if not deps['yt-dlp']:
        print("❌ Error: 'yt-dlp' executable is missing. Please install it to continue.")
        sys.exit(1)
        
    print("="*60)
    print("      SurvivalOS — Offline YouTube Library Downloader")
    print("="*60)
    print(f"📁 Library Root: {materials_dir}")
    print(f"⚙️ yt-dlp:       Available")
    print(f"⚙️ ffmpeg:       {'Available (HQ stream merging enabled)' if deps['ffmpeg'] else 'Missing (Pre-merged format fallback enabled)'}")
    print("="*60)
    
    while True:
        print("\nMAIN MENU:")
        print("  [1] Search YouTube & Select Videos to Download")
        print("  [2] Download Single Video by URL")
        print("  [3] Download Outdoor Boys Channel (All Videos)")
        print("  [4] Download Outdoor Boys Channel (Latest N Videos)")
        print("  [5] Custom Channel / Playlist URL Download")
        print("  [6] Exit")
        
        try:
            choice = input("\nEnter choice [1-6]: ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\nExiting.")
            break
            
        if choice == '1':
            query = input("Enter search query: ").strip()
            if not query:
                continue
            entries = search_youtube(query, limit=15)
            if not entries:
                print("No results found.")
                continue
                
            print("\nSEARCH RESULTS:")
            for idx, entry in enumerate(entries):
                title = entry.get('title', 'Unknown')
                uploader = entry.get('uploader', 'Unknown')
                duration = format_duration(entry.get('duration'))
                print(f"  [{idx + 1:2d}] {title}")
                print(f"       Uploader: {uploader} | Duration: {duration} | ID: {entry.get('id')}")
                
            selection = input("\nEnter video numbers to download (e.g. 1, 3-5, all, or press Enter to cancel): ").strip()
            if not selection:
                continue
                
            to_download = []
            if selection.lower() == 'all':
                to_download = entries
            else:
                # Parse selections like 1, 3-5
                parts = selection.split(',')
                for p in parts:
                    p = p.strip()
                    if '-' in p:
                        try:
                            start, end = map(int, p.split('-'))
                            to_download.extend(entries[start-1:end])
                        except:
                            pass
                    else:
                        try:
                            num = int(p)
                            to_download.append(entries[num-1])
                        except:
                            pass
            
            for entry in to_download:
                url = entry.get('url') or f"https://www.youtube.com/watch?v={entry.get('id')}"
                uploader = entry.get('uploader', 'General').replace('/', '_').replace('\\', '_')
                dest = os.path.join(materials_dir, 'Videos', uploader)
                download_video(url, dest, deps['ffmpeg'])
                
        elif choice == '2':
            url = input("Enter YouTube video URL: ").strip()
            if not url:
                continue
            dest = os.path.join(materials_dir, 'Videos', 'General')
            download_video(url, dest, deps['ffmpeg'])
            
        elif choice == '3':
            confirm = input("Are you sure you want to download ALL videos from Outdoor Boys? (This will download hundreds of videos!) [y/N]: ").strip().lower()
            if confirm == 'y':
                dest = os.path.join(materials_dir, 'Videos', 'Outdoor Boys')
                download_channel("https://www.youtube.com/@OutdoorBoys", dest, deps['ffmpeg'])
                
        elif choice == '4':
            try:
                count = int(input("How many latest videos do you want to download? ").strip())
                dest = os.path.join(materials_dir, 'Videos', 'Outdoor Boys')
                download_channel("https://www.youtube.com/@OutdoorBoys", dest, deps['ffmpeg'], limit=count)
            except ValueError:
                print("Invalid number.")
                
        elif choice == '5':
            url = input("Enter YouTube Channel or Playlist URL: ").strip()
            if not url:
                continue
            uploader = input("Enter channel/playlist folder name (optional, press enter to auto-detect): ").strip()
            folder = uploader if uploader else "General"
            dest = os.path.join(materials_dir, 'Videos', folder)
            download_channel(url, dest, deps['ffmpeg'])
            
        elif choice == '6':
            print("Goodbye.")
            break
        else:
            print("Invalid choice.")

if __name__ == '__main__':
    main()
