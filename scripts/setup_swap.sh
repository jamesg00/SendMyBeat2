#!/bin/bash

# Define swap file location and size (2G)
SWAPFILE=/swapfile
SIZE=2G

echo "Checking for existing swap..."
if [ -f "$SWAPFILE" ]; then
    echo "Swap file $SWAPFILE already exists."
else
    echo "Creating $SIZE swap file at $SWAPFILE..."
    sudo fallocate -l $SIZE $SWAPFILE
    sudo chmod 600 $SWAPFILE
    sudo mkswap $SWAPFILE
    sudo swapon $SWAPFILE
    echo "$SWAPFILE none swap sw 0 0" | sudo tee -a /etc/fstab
    echo "Swap enabled and persisted in /etc/fstab."

    # Verify
    echo "Current swap status:"
    sudo swapon --show
    free -h
fi
