until /usr/bin/nodejs /home/pi/siphonage/main_xj615.js; do
    echo "Server siphonage  crashed with exit code $?.  Respawning.." >&2
    sleep 5
done
