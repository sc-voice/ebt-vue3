#!/bin/bash
DIR=`dirname $0`
SCRIPT=`basename $0 | tr abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ`
APPDIR=$DIR/..

echo -e "$SCRIPT: updating voices.json"
URL=https://raw.githubusercontent.com/sc-voice/api_sc-voice_net/main/words/voices.json
KEYS="name label langTrans gender iVoice locale service"

VOICES=`curl -s $URL | json -a -o json json-2 $KEYS`
cat > $APPDIR/src/auto/voices.json << VOICES_JSON
$VOICES
VOICES_JSON

cat > $APPDIR/src/auto/voices.mjs << VOICES_MJS
const VOICES= $VOICES
export default VOICES
VOICES_MJS
