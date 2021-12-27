#!/bin/bash

echo "!!! Building TiddlyWiki static HTML ..."

cd /tiddlywiki
node ./tiddlywiki.js editions/rfs-build --build index
cp ./editions/rfs-build/output/index.html /tiddlywiki-html/index.html
