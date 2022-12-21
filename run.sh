#!/bin/bash

export $(grep -v '^#' .env | xargs -d '\n')
for i in {0..10}
do
  echo "Crashed $i times, starting again."
  node src/test_bot.js >> bot.log 2>&1
done
