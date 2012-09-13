#!/bin/sh

case $1 in
  start)
    if [ -e "/var/www/findabikefor.me/shared/pids/unicorn.pid" ];
    then
      echo "Unicorn pid file exists";
    else
      echo "Starting"
      ruby -C /var/www/findabikefor.me/current -S bundle exec unicorn -D -E production -c /var/www/findabikefor.me/current/config/unicorn.conf /var/www/findabikefor.me/current/config.ru;
    fi
    ;;  
  stop)
    if [ -e "/var/www/findabikefor.me/shared/pids/unicorn.pid" ];
    then
      pid=`cat /var/www/findabikefor.me/shared/pids/unicorn.pid`;
      kill -s QUIT $pid;
      rm -f /var/www/findabikefor.me/shared/pids/unicorn.pid;
    else
      echo "No pid file for unicorn";
    fi
    ;;  
  *)  
    echo >&2 "Usage: $0 <start|stop>"
    exit 1
    ;;  
esac
