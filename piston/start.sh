#!/bin/sh

CGROUP=/sys/fs/cgroup/isolate

if [ -d "$CGROUP" ]; then
  # Migrate all processes out of child cgroups back to root
  for procs in "$CGROUP"/*/cgroup.procs "$CGROUP/cgroup.procs"; do
    [ -f "$procs" ] && while read -r pid; do
      echo "$pid" > /sys/fs/cgroup/cgroup.procs 2>/dev/null || true
    done < "$procs"
  done
  # Remove child cgroups first, then the parent
  for child in "$CGROUP"/*/; do
    [ -d "$child" ] && rmdir "$child" 2>/dev/null || true
  done
  rmdir "$CGROUP" 2>/dev/null || true
fi

exec /piston_api/src/docker-entrypoint.sh
