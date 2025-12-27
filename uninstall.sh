#!/bin/sh
# Uninstallation script for luci-app-podkop-subscribe

# Don't exit on errors - we want to clean up as much as possible
set +e

echo "=========================================="
echo "luci-app-podkop-subscribe Uninstallation"
echo "=========================================="
echo ""

# Check if running as root
if [ "$(id -u)" -ne 0 ]; then
    echo "Error: This script must be run as root"
    exit 1
fi

echo "Step 1: Removing plugin files..."

PLUGIN_REMOVED=0

# Remove CGI scripts
if [ -f /www/cgi-bin/podkop-subscribe ]; then
    rm -f /www/cgi-bin/podkop-subscribe
    echo "  ✓ Removed: /www/cgi-bin/podkop-subscribe"
    PLUGIN_REMOVED=1
fi

if [ -f /www/cgi-bin/podkop-xray-config ]; then
    rm -f /www/cgi-bin/podkop-xray-config
    echo "  ✓ Removed: /www/cgi-bin/podkop-xray-config"
    PLUGIN_REMOVED=1
fi

# Remove JavaScript files
if [ -f /www/luci-static/resources/view/podkop/subscribe.js ]; then
    rm -f /www/luci-static/resources/view/podkop/subscribe.js
    echo "  ✓ Removed: subscribe.js"
    PLUGIN_REMOVED=1
fi

if [ -f /www/luci-static/resources/view/podkop/subscribe-loader.js ]; then
    rm -f /www/luci-static/resources/view/podkop/subscribe-loader.js
    echo "  ✓ Removed: subscribe-loader.js"
    PLUGIN_REMOVED=1
fi

# Remove ACL file
if [ -f /usr/share/rpcd/acl.d/luci-app-podkop-subscribe.json ]; then
    rm -f /usr/share/rpcd/acl.d/luci-app-podkop-subscribe.json
    echo "  ✓ Removed: ACL configuration"
    PLUGIN_REMOVED=1
fi

if [ "$PLUGIN_REMOVED" -eq 0 ]; then
    echo "  ℹ No plugin files found to remove (may already be removed)"
fi

# Remove subscribe URLs from podkop config
echo ""
echo "Step 2: Cleaning subscribe URLs from /etc/config/podkop..."

UCI_CLEANED=0

# Get all podkop sections and remove subscribe_url options
if command -v uci >/dev/null 2>&1 && [ -f /etc/config/podkop ]; then
    # Find all options with subscribe_url or subscribe_url_outbound and delete them
    for key in $(uci show podkop 2>/dev/null | grep -E "\.subscribe_url=|\.subscribe_url_outbound=" | cut -d'=' -f1); do
        # key = podkop.gg.subscribe_url
        if [ -n "$key" ]; then
            uci delete "$key" 2>/dev/null && {
                echo "  ✓ Removed: $key"
                UCI_CLEANED=1
            }
        fi
    done

    if [ "$UCI_CLEANED" -eq 1 ]; then
        uci commit podkop 2>/dev/null
        echo "  ✓ Changes committed to /etc/config/podkop"
    else
        echo "  ℹ No subscribe URLs found in config"
    fi
else
    echo "  ℹ UCI not available or podkop config not found"
fi

# Restore original section.js
echo ""
echo "Step 3: Restoring original Podkop section.js..."

RESTORED=0

# Function to check if file contains plugin code (using multiple simple greps)
contains_plugin_code() {
    file="$1"
    [ ! -f "$file" ] && return 1
    grep -q "subscribeExt" "$file" 2>/dev/null && return 0
    grep -q "view.podkop.subscribe" "$file" 2>/dev/null && return 0
    grep -q "podkop-subscribe-config-list" "$file" 2>/dev/null && return 0
    grep -q "enhanceSectionWithSubscribe" "$file" 2>/dev/null && return 0
    return 1
}

# Check if current section.js contains plugin code
if [ -f /www/luci-static/resources/view/podkop/section.js ]; then
    if ! contains_plugin_code /www/luci-static/resources/view/podkop/section.js; then
        echo "  ℹ section.js does not contain plugin code, no restoration needed"
        RESTORED=1
    else
        echo "  ℹ section.js contains plugin code, attempting restoration..."
    fi
else
    echo "  ⚠ section.js not found"
fi

# Restore from backup
if [ "$RESTORED" -eq 0 ] && [ -f /www/luci-static/resources/view/podkop/section.js.backup ]; then
    if ! contains_plugin_code /www/luci-static/resources/view/podkop/section.js.backup; then
        cp /www/luci-static/resources/view/podkop/section.js.backup /www/luci-static/resources/view/podkop/section.js
        echo "  ✓ Restored: section.js from backup"
        RESTORED=1
    else
        echo "  ⚠ Backup file also contains plugin code, cannot use it"
    fi
fi

# Try to restore from overlay (OpenWrt stores original files there)
if [ "$RESTORED" -eq 0 ]; then
    if [ -f /rom/www/luci-static/resources/view/podkop/section.js ]; then
        if ! contains_plugin_code /rom/www/luci-static/resources/view/podkop/section.js; then
            cp /rom/www/luci-static/resources/view/podkop/section.js /www/luci-static/resources/view/podkop/section.js
            echo "  ✓ Restored: section.js from /rom"
            RESTORED=1
        fi
    fi
fi

# Final status
if [ "$RESTORED" -eq 0 ]; then
    if [ -f /www/luci-static/resources/view/podkop/section.js ]; then
        if contains_plugin_code /www/luci-static/resources/view/podkop/section.js; then
            echo ""
            echo "  ⚠ CRITICAL: section.js still contains plugin code!"
            echo "  ⚠ Podkop LuCI interface may not work correctly."
            echo ""
            echo "  To manually fix, reinstall luci-app-podkop from:"
            echo "    https://github.com/itdoginfo/podkop"
        fi
    fi
fi

echo ""
echo "Step 4: Restarting uhttpd..."
/etc/init.d/uhttpd restart >/dev/null 2>&1 || true

echo ""
echo "=========================================="
if [ "$RESTORED" -eq 1 ]; then
    echo "Uninstallation completed successfully!"
else
    echo "Uninstallation completed with warnings!"
fi
echo "=========================================="
echo ""
echo "✓ Plugin files have been removed."
echo "✓ Subscribe URLs have been cleaned from config."
echo "✓ Podkop and its dependencies have NOT been removed."
echo ""
echo "Please clear your browser cache (Ctrl+F5) and reload LuCI."
echo ""
