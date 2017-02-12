#!/usr/bin/env bash

echo "Before install - OS is $TRAVIS_OS_NAME"

echo "Updating both homebrew, mongodb and redis-server"
if [[ $TRAVIS_OS_NAME = 'osx' ]]; then
    echo "Updating homebrew"
    brew update
    echo "Installing and starting mongodb"
    brew install mongodb
    # create a folder for mongodb to prevent an error on mac osx
    sudo mkdir -p /data/db
    brew services start mongodb
fi