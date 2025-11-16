#!/usr/bin/env python3
"""
FFmpeg installation script for deployment
Ensures FFmpeg is installed when the backend starts
"""
import subprocess
import shutil
import sys
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def install_ffmpeg():
    """Install FFmpeg if not already installed"""
    # Check if ffmpeg is already installed
    ffmpeg_path = shutil.which('ffmpeg')
    
    if ffmpeg_path:
        logger.info(f"✅ FFmpeg already installed at: {ffmpeg_path}")
        return True
    
    logger.info("⚠️  FFmpeg not found. Installing...")
    
    try:
        # Update package list
        logger.info("Updating package list...")
        subprocess.run(
            ['apt-get', 'update'],
            check=True,
            capture_output=True,
            timeout=120
        )
        
        # Install ffmpeg
        logger.info("Installing FFmpeg...")
        subprocess.run(
            ['apt-get', 'install', '-y', 'ffmpeg'],
            check=True,
            capture_output=True,
            timeout=300
        )
        
        # Verify installation
        ffmpeg_path = shutil.which('ffmpeg')
        if ffmpeg_path:
            logger.info(f"✅ FFmpeg successfully installed at: {ffmpeg_path}")
            return True
        else:
            logger.error("❌ FFmpeg installation verification failed")
            return False
            
    except subprocess.CalledProcessError as e:
        logger.error(f"❌ Failed to install FFmpeg: {e}")
        logger.error(f"Error output: {e.stderr if hasattr(e, 'stderr') else 'No error output'}")
        return False
    except Exception as e:
        logger.error(f"❌ Unexpected error installing FFmpeg: {str(e)}")
        return False

if __name__ == "__main__":
    success = install_ffmpeg()
    sys.exit(0 if success else 1)
