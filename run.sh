#!/bin/sh

export $(grep -v '^#' .env | xargs -d '\n')
node src/test_bot.js >> bot.log 2>&1
