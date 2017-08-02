until /usr/bin/nodejs /home/pi/siphonage/daemon-main.js; do
    echo "Server siphonage  crashed with exit code $?.  Respawning.." >&2
    sleep 5
done
