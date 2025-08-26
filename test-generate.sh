#!/bin/bash

# Test script for local generation
# Run this with: OPENAI_API_KEY=your-key-here bash test-generate.sh

if [ -z "$OPENAI_API_KEY" ]; then
  echo "Error: OPENAI_API_KEY environment variable is required"
  echo "Usage: OPENAI_API_KEY=your-api-key bash test-generate.sh"
  exit 1
fi

echo "Testing horoscope generation..."
echo "API Key is set: ${OPENAI_API_KEY:0:10}..."

# Run the generation
npm run gen:tomorrow