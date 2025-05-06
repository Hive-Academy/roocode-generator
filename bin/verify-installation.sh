#!/bin/sh

# Installation verification script for roocode global command

if command -v roocode >/dev/null 2>&1; then
      echo "roocode command is installed and available in PATH."
      roocode --version
      exit 0
else
      echo "roocode command is NOT installed or not found in PATH."
      exit 1
fi
