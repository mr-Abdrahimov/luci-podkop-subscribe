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
    if [ $? -eq 0 ]; then
        echo "  ✓ Removed: /www/cgi-bin/podkop-subscribe"
        PLUGIN_REMOVED=1
    else
        echo "  ✗ Error: Failed to remove /www/cgi-bin/podkop-subscribe"
    fi
fi

if [ -f /www/cgi-bin/podkop-subscribe-url ]; then
    rm -f /www/cgi-bin/podkop-subscribe-url
    if [ $? -eq 0 ]; then
        echo "  ✓ Removed: /www/cgi-bin/podkop-subscribe-url"
        PLUGIN_REMOVED=1
    else
        echo "  ✗ Error: Failed to remove /www/cgi-bin/podkop-subscribe-url"
    fi
fi

# Remove ACL file
if [ -f /usr/share/rpcd/acl.d/luci-app-podkop-subscribe.json ]; then
    rm -f /usr/share/rpcd/acl.d/luci-app-podkop-subscribe.json
    if [ $? -eq 0 ]; then
        echo "  ✓ Removed: ACL configuration"
        PLUGIN_REMOVED=1
    else
        echo "  ✗ Error: Failed to remove ACL file"
    fi
fi

# Remove temporary files
if [ -f /tmp/podkop_subscribe_url.txt ]; then
    rm -f /tmp/podkop_subscribe_url.txt
    if [ $? -eq 0 ]; then
        echo "  ✓ Removed: temporary Subscribe URL storage"
    fi
fi

# Verify all plugin files are removed
if [ "$PLUGIN_REMOVED" -eq 0 ]; then
    echo "  ℹ No plugin files found to remove (may already be removed)"
fi

# Restore original section.js
echo ""
echo "Step 2: Restoring original Podkop section.js..."

RESTORED=0
SKIP_DELETE=0

# Check if current file contains plugin code
if [ -f /www/luci-static/resources/view/podkop/section.js ]; then
    if ! grep -q "podkop-subscribe-config-list\|podkop-subscribe-loading\|podkop-subscribe-url" /www/luci-static/resources/view/podkop/section.js 2>/dev/null; then
        echo "  ℹ section.js does not contain plugin code, no restoration needed"
        RESTORED=1
        SKIP_DELETE=1
    fi
fi

# Method 1: Restore from backup if exists
if [ "$RESTORED" -eq 0 ] && [ -f /www/luci-static/resources/view/podkop/section.js.backup ]; then
    # Check if backup contains plugin code
    if grep -q "podkop-subscribe-config-list\|podkop-subscribe-loading\|podkop-subscribe-url" /www/luci-static/resources/view/podkop/section.js.backup 2>/dev/null; then
        echo "  ⚠ Warning: Backup file contains plugin code, cannot use it"
    else
        cp /www/luci-static/resources/view/podkop/section.js.backup /www/luci-static/resources/view/podkop/section.js
        if [ $? -eq 0 ]; then
            echo "  ✓ Restored: section.js from backup"
            RESTORED=1
        fi
    fi
fi

# Method 2: Try to find original file in overlay
if [ "$RESTORED" -eq 0 ] && [ -f /overlay/upper/www/luci-static/resources/view/podkop/section.js ]; then
    # Check if overlay file contains plugin code
    if ! grep -q "podkop-subscribe-config-list\|podkop-subscribe-loading\|podkop-subscribe-url" /overlay/upper/www/luci-static/resources/view/podkop/section.js 2>/dev/null; then
        cp /overlay/upper/www/luci-static/resources/view/podkop/section.js /www/luci-static/resources/view/podkop/section.js
        if [ $? -eq 0 ]; then
            echo "  ✓ Restored: section.js from overlay (original Podkop file)"
            RESTORED=1
        fi
    fi
fi

# Method 3: Try to reinstall Podkop package (only if luci-app-podkop is available)
if [ "$RESTORED" -eq 0 ] && opkg list-installed | grep -q "^luci-app-podkop "; then
    echo "  - Attempting to restore via Podkop reinstall..."
    # Check if package can be reinstalled
    if opkg list | grep -q "^luci-app-podkop "; then
        # Remove the modified file first to ensure clean restore
        rm -f /www/luci-static/resources/view/podkop/section.js
        # Use --force-reinstall and --force-overwrite to ensure files are replaced
        opkg --force-reinstall --force-overwrite install luci-app-podkop 2>&1 | grep -v "^Removing\|^Installing\|^Configuring\|^Upgrading" || true
        if [ -f /www/luci-static/resources/view/podkop/section.js ]; then
            # Verify it doesn't contain plugin code
            if ! grep -q "podkop-subscribe-config-list\|podkop-subscribe-loading\|podkop-subscribe-url" /www/luci-static/resources/view/podkop/section.js 2>/dev/null; then
                echo "  ✓ Restored: section.js via Podkop reinstall"
                RESTORED=1
            else
                echo "  ⚠ Warning: Reinstalled file still contains plugin code"
            fi
        else
            echo "  ⚠ Warning: Podkop reinstall did not restore section.js"
        fi
    else
        echo "  ⚠ Warning: luci-app-podkop package not available in repositories"
    fi
fi

# Final verification
if [ "$SKIP_DELETE" -eq 0 ]; then
    if [ -f /www/luci-static/resources/view/podkop/section.js ]; then
        # Check if file still contains plugin code
        if grep -q "podkop-subscribe-config-list\|podkop-subscribe-loading\|podkop-subscribe-url" /www/luci-static/resources/view/podkop/section.js 2>/dev/null; then
            echo "  ⚠ Warning: section.js still contains plugin code!"
            echo "  ⚠ CRITICAL: Cannot safely remove plugin code without breaking Podkop"
            echo "  ⚠ The file will be left as-is to prevent breaking Podkop functionality"
            echo "  ⚠ You may need to manually restore the original Podkop file"
            RESTORED=0
        else
            # File exists and doesn't contain plugin code - consider it restored
            if [ "$RESTORED" -eq 0 ]; then
                echo "  ✓ Verified: section.js does not contain plugin code (already clean)"
                RESTORED=1
            fi
        fi
    else
        # File doesn't exist - this is a problem, but we won't break Podkop by leaving it missing
        echo "  ⚠ Warning: section.js file is missing"
        echo "  ⚠ Podkop interface may not work until section.js is restored"
        RESTORED=0
    fi
fi

echo ""
echo "Step 3: Restarting uhttpd..."
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
echo "Plugin files have been removed."

if [ "$RESTORED" -eq 1 ]; then
    echo "✓ Original Podkop section.js has been restored."
else
    echo "⚠ Warning: Could not automatically restore Podkop section.js"
    echo ""
    echo "The file may still contain plugin code, but Podkop functionality"
    echo "should remain intact. To manually restore:"
    echo ""
    echo "1. If you have a backup:"
    echo "   cp /www/luci-static/resources/view/podkop/section.js.backup /www/luci-static/resources/view/podkop/section.js"
    echo ""
    echo "2. If backup contains plugin code, try:"
    echo "   cp /overlay/upper/www/luci-static/resources/view/podkop/section.js /www/luci-static/resources/view/podkop/section.js"
    echo ""
    echo "3. If luci-app-podkop is available:"
    echo "   opkg --force-reinstall --force-overwrite install luci-app-podkop"
    echo ""
    echo "Then restart uhttpd: /etc/init.d/uhttpd restart"
fi

echo ""
echo "✓ Podkop and its dependencies have NOT been removed."
echo ""
echo "Verification steps:"
echo "1. Clear your browser cache (Ctrl+F5 or Cmd+Shift+R)"
echo "2. Navigate to: LuCI -> Services -> Podkop"
echo "3. Set Connection Type to 'Proxy' and Configuration Type to 'Connection URL'"
echo "4. Verify that Subscribe URL field is NO LONGER visible"
echo "5. Verify that Podkop is working correctly"
echo ""
