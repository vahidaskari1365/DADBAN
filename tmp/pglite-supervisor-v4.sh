#!/bin/bash
# سوپروایزر PGlite لوکال — اگر پروسه افتاد دوباره بالا می‌آورد
while true; do
  bun /home/z/my-project/tmp/pglite-serve-v4.ts >> /home/z/my-project/tmp/pglite-serve-v4.log 2>&1
  echo "[supervisor] pglite exited ($?), restarting in 2s..." >> /home/z/my-project/tmp/pglite-serve-v4.log
  sleep 2
done
