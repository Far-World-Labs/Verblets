#!/bin/bash

script_name="$1"
if [[ "$script_name" =~ ^[a-zA-Z0-9_-]+$ ]]; then
    script_path="./scripts/$script_name/index.js"
    if [[ -f "$script_path" ]]; then
        node "$script_path" $2
    else
        echo "Script not found: $script_path"
        exit 1
    fi
else
    echo "Invalid script name: $script_name"
    exit 1
fi
