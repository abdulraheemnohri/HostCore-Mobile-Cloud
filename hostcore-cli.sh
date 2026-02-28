#!/data/data/com.termux/files/usr/bin/bash
# HostCore CLI Utility

case "$1" in
    list)
        pm2 list
        ;;
    status)
        pm2 status
        ;;
    restart)
        pm2 restart "$2"
        ;;
    stop)
        pm2 stop "$2"
        ;;
    logs)
        pm2 logs "$2"
        ;;
    *)
        echo "Usage: hostcore {list|status|restart|stop|logs} [appname]"
        ;;
esac
