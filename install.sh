#!/bin/sh
# Installation script for luci-app-podkop-subscribe

set -e

REPO_URL="https://raw.githubusercontent.com/mr-Abdrahimov/luci-podkop-subscribe/main"
BASE_URL="${REPO_URL}/files"

echo "=========================================="
echo "luci-app-podkop-subscribe Installation"
echo "=========================================="
echo ""

# Check if running as root
if [ "$(id -u)" -ne 0 ]; then
    echo "Error: This script must be run as root"
    exit 1
fi

# Check if Podkop is installed (check for either podkop or luci-app-podkop)
if ! opkg list-installed | grep -qE "^(podkop|luci-app-podkop) "; then
    echo "Error: Podkop is not installed"
    echo "Please install Podkop first: opkg install podkop"
    exit 1
fi

# Check if section.js exists or can be found
if [ ! -f /www/luci-static/resources/view/podkop/section.js ] && [ ! -f /overlay/upper/www/luci-static/resources/view/podkop/section.js ]; then
    echo "Warning: Podkop LuCI interface file not found"
    echo "The plugin will create section.js, but Podkop LuCI interface may not work correctly"
    echo "Please ensure Podkop LuCI interface is properly installed"
fi

# Check if wget is installed
if ! command -v wget >/dev/null 2>&1; then
    echo "Installing wget..."
    opkg update >/dev/null 2>&1 || true
    opkg install wget || {
        echo "Error: Failed to install wget"
        exit 1
    }
fi

echo "Step 1: Creating directories..."
mkdir -p /www/cgi-bin
mkdir -p /www/luci-static/resources/view/podkop
mkdir -p /usr/share/rpcd/acl.d

echo "Step 2: Backing up original Podkop files..."

# Helper function to check if file contains plugin code
contains_plugin_code() {
    [ ! -f "$1" ] && return 1
    grep -q "podkop-subscribe-config-list\|podkop-subscribe-loading\|view.podkop.subscribe\|enhanceSectionWithSubscribe" "$1" 2>/dev/null
}

# Check if backup already exists and is clean
if [ -f /www/luci-static/resources/view/podkop/section.js.backup ]; then
    if ! contains_plugin_code /www/luci-static/resources/view/podkop/section.js.backup; then
        echo "  ✓ Clean backup already exists"
    else
        echo "  ⚠ Existing backup contains plugin code, trying to get clean original..."
        # Try to get clean original from overlay or opkg
        if [ -f /overlay/upper/www/luci-static/resources/view/podkop/section.js ]; then
            if ! contains_plugin_code /overlay/upper/www/luci-static/resources/view/podkop/section.js; then
                cp /overlay/upper/www/luci-static/resources/view/podkop/section.js /www/luci-static/resources/view/podkop/section.js.backup
                echo "  ✓ Backup recreated from overlay"
            fi
        fi
    fi
elif [ -f /www/luci-static/resources/view/podkop/section.js ]; then
    if ! contains_plugin_code /www/luci-static/resources/view/podkop/section.js; then
        # Current file is original, create backup
        cp /www/luci-static/resources/view/podkop/section.js /www/luci-static/resources/view/podkop/section.js.backup
        echo "  ✓ Backup created: section.js.backup"
    else
        echo "  ℹ Current file contains plugin code (reinstalling)"
        # Try to find original in overlay
        if [ -f /overlay/upper/www/luci-static/resources/view/podkop/section.js ]; then
            if ! contains_plugin_code /overlay/upper/www/luci-static/resources/view/podkop/section.js; then
                cp /overlay/upper/www/luci-static/resources/view/podkop/section.js /www/luci-static/resources/view/podkop/section.js.backup
                echo "  ✓ Backup created from overlay"
            else
                echo "  ⚠ No clean original found for backup"
            fi
        else
            echo "  ⚠ No clean original found for backup"
        fi
    fi
else
    echo "  ⚠ Warning: section.js not found"
    # Try to find original in overlay
    if [ -f /overlay/upper/www/luci-static/resources/view/podkop/section.js ]; then
        if ! contains_plugin_code /overlay/upper/www/luci-static/resources/view/podkop/section.js; then
            cp /overlay/upper/www/luci-static/resources/view/podkop/section.js /www/luci-static/resources/view/podkop/section.js.backup
            echo "  ✓ Backup created from overlay"
        fi
    fi
fi

echo "Step 3: Downloading and installing plugin files..."

# Download CGI scripts
echo "  - Installing podkop-subscribe..."
wget -q -O /www/cgi-bin/podkop-subscribe "${BASE_URL}/www/cgi-bin/podkop-subscribe" || {
    echo "Error: Failed to download podkop-subscribe"
    exit 1
}
chmod +x /www/cgi-bin/podkop-subscribe

echo "  - Installing podkop-xray-config..."
wget -q -O /www/cgi-bin/podkop-xray-config "${BASE_URL}/www/cgi-bin/podkop-xray-config" || {
    echo "Error: Failed to download podkop-xray-config"
    exit 1
}
chmod +x /www/cgi-bin/podkop-xray-config

# Download JavaScript files
echo "  - Installing section.js..."
wget -q -O /www/luci-static/resources/view/podkop/section.js "${BASE_URL}/www/luci-static/resources/view/podkop/section.js" || {
    echo "Error: Failed to download section.js"
    exit 1
}
chmod 644 /www/luci-static/resources/view/podkop/section.js

echo "  - Installing subscribe.js..."
wget -q -O /www/luci-static/resources/view/podkop/subscribe.js "${BASE_URL}/www/luci-static/resources/view/podkop/subscribe.js" || {
    echo "Error: Failed to download subscribe.js"
    exit 1
}
chmod 644 /www/luci-static/resources/view/podkop/subscribe.js

echo "  - Installing subscribe-loader.js..."
wget -q -O /www/luci-static/resources/view/podkop/subscribe-loader.js "${BASE_URL}/www/luci-static/resources/view/podkop/subscribe-loader.js" || {
    echo "Warning: Failed to download subscribe-loader.js (optional file)"
}
chmod 644 /www/luci-static/resources/view/podkop/subscribe-loader.js 2>/dev/null || true

# Download ACL file
echo "  - Installing ACL configuration..."
wget -q -O /usr/share/rpcd/acl.d/luci-app-podkop-subscribe.json "${BASE_URL}/usr/share/rpcd/acl.d/luci-app-podkop-subscribe.json" || {
    echo "Error: Failed to download ACL file"
    exit 1
}

echo "Step 4: Restarting uhttpd..."
/etc/init.d/uhttpd restart >/dev/null 2>&1 || true

echo ""
echo "=========================================="
echo "Installation completed successfully!"
echo "=========================================="
echo ""
echo "The plugin has been installed. Please:"
echo "1. Clear your browser cache (Ctrl+F5)"
echo "2. Navigate to: LuCI -> Services -> Podkop"
echo "3. Set Connection Type to 'Proxy'"
echo "4. Set Configuration Type to 'Connection URL' or 'Outbound Config'"
echo "5. You should see the Subscribe URL field"
echo ""
echo "Features:"
echo "  - Connection URL mode: Get configurations and apply to Podkop proxy"
echo "  - Outbound Config mode: Get configurations and apply directly to Xray"
echo "  - Supported protocols: vless://, ss://, trojan://, hy2://, hysteria2://"
echo "  - Theme support: Automatically adapts to light/dark themes"
echo ""
echo "To uninstall, run:"
echo "  sh <(wget -O - ${REPO_URL}/uninstall.sh)"
echo ""
