"use strict";

"require form";
"require ui";
"require dom";
"require baseclass";
"require view.podkop.main as main";

// Inject CSS styles for theming support
function injectSubscribeStyles() {
  if (document.getElementById("podkop-subscribe-styles")) return;

  var style = document.createElement("style");
  style.id = "podkop-subscribe-styles";
  style.textContent = `
    .podkop-subscribe-loading {
      padding: 10px;
      background: var(--primary-color-low, #e3f2fd);
      border: 1px solid var(--primary-color-high, #2196f3);
      border-radius: 4px;
      color: var(--primary-color-high, #1976d2);
    }
    .podkop-subscribe-error {
      padding: 10px;
      background: #dc3545;
      border: 1px solid #c82333;
      border-radius: 4px;
      color: #ffffff;
      font-weight: 500;
    }
    .podkop-subscribe-error-small {
      margin-top: 5px;
      padding: 5px;
      background: #dc3545;
      border: 1px solid #c82333;
      border-radius: 4px;
      color: #ffffff;
      font-size: 12px;
      font-weight: 500;
    }
    .podkop-subscribe-success {
      margin-top: 5px;
      padding: 5px;
      background: #28a745;
      border: 1px solid #1e7e34;
      border-radius: 4px;
      color: #ffffff;
      font-size: 12px;
      font-weight: 500;
    }
    .podkop-subscribe-warning {
      margin-top: 5px;
      padding: 5px;
      background: var(--warn-color-low, #fff3cd);
      border: 1px solid var(--warn-color-medium, #ffc107);
      border-radius: 4px;
      color: var(--warn-color-high, #856404);
      font-size: 12px;
    }
    .podkop-subscribe-title {
      margin-bottom: 10px;
      font-size: 14px;
      color: var(--text-color-medium, #666);
    }
    .podkop-subscribe-list {
      max-height: 300px;
      overflow-y: auto;
      padding: 15px;
      border: 1px solid var(--background-color-low, #ddd);
      border-radius: 4px;
      background: var(--background-color-high, #f9f9f9);
    }
    .podkop-subscribe-item {
      margin: 8px 0;
      padding: 10px;
      border: 1px solid var(--background-color-low, #ccc);
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s ease;
      background: var(--background-color-high, white);
    }
    .podkop-subscribe-item:hover {
      background: var(--primary-color-low, #e8f4f8);
      border-color: var(--primary-color-high, #0078d4);
    }
    .podkop-subscribe-item.selected {
      background: var(--success-color-low, #d4edda);
      border-color: var(--success-color-medium, #28a745);
    }
    .podkop-subscribe-item-title {
      font-weight: bold;
      margin-bottom: 3px;
      font-size: 13px;
      color: var(--text-color-high, inherit);
    }
    .podkop-subscribe-item-protocol {
      display: inline-block;
      padding: 1px 5px;
      margin-left: 8px;
      font-size: 10px;
      font-weight: 500;
      border-radius: 3px;
      background: transparent;
      border: 1px solid currentColor;
      opacity: 0.7;
      text-transform: uppercase;
    }
    .podkop-subscribe-label {
      width: 200px;
      padding-right: 10px;
      display: inline-block;
      vertical-align: top;
    }
    .podkop-subscribe-field {
      display: inline-block;
      width: calc(100% - 220px);
    }
    .podkop-subscribe-item.urltest-selected {
      background: var(--primary-color-low, #e3f2fd);
      border-color: var(--primary-color-high, #2196f3);
      position: relative;
    }
    .podkop-subscribe-item.urltest-selected::after {
      content: "✓";
      position: absolute;
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--primary-color-high, #2196f3);
      font-weight: bold;
      font-size: 16px;
    }
    .podkop-subscribe-item.xhttp-disabled {
      opacity: 0.5;
      cursor: not-allowed;
      background: var(--error-color-low, #ffebee);
      border-color: var(--error-color-medium, #f44336);
    }
    .podkop-subscribe-item.xhttp-disabled:hover {
      background: var(--error-color-low, #ffebee);
      border-color: var(--error-color-medium, #f44336);
    }
    .podkop-subscribe-xhttp-badge {
      display: inline-block;
      padding: 1px 5px;
      margin-left: 8px;
      font-size: 10px;
      font-weight: 500;
      border-radius: 3px;
      background: #dc3545;
      border: 1px solid #c82333;
      color: #ffffff;
      text-transform: uppercase;
    }
    .podkop-subscribe-urltest-counter {
      display: inline-block;
      margin-left: 10px;
      padding: 2px 8px;
      background: var(--primary-color-high, #2196f3);
      color: white;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 500;
    }
  `;
  document.head.appendChild(style);
}

// Remove config lists when connection type or proxy_config_type changes
function removeConfigLists() {
  // Find all config lists by ID prefix pattern and remove them from DOM
  var allLists = document.querySelectorAll('[id^="podkop-subscribe-config-list"]');
  allLists.forEach(function(list) {
    if (list.parentNode) {
      list.parentNode.removeChild(list);
    }
  });
  // Also remove loading indicators
  var allLoading = document.querySelectorAll('[id^="podkop-subscribe-loading"]');
  allLoading.forEach(function(loading) {
    if (loading.parentNode) {
      loading.parentNode.removeChild(loading);
    }
  });
}

// Extract section_id from element ID (e.g., "cbid.podkop.cfg123.proxy_config_type" -> "cfg123")
function getSectionIdFromElement(el) {
  if (!el || !el.id) return null;
  var match = el.id.match(/podkop\.([^.]+)\./);
  return match ? match[1] : null;
}

// Refetch configs for a section when proxy_config_type changes
function refetchConfigsForSection(select) {
  var section_id = getSectionIdFromElement(select);
  if (!section_id) return;

  var newType = select.value;

  // Only refetch for url/urltest modes (not outbound - it has separate subscribe_url_outbound)
  if (newType !== "url" && newType !== "urltest") {
    removeConfigLists();
    return;
  }

  // Find subscribe_url input for this section
  var subscribeInput = document.querySelector(
    'input[id*="' + section_id + '"][id*="subscribe_url"]'
  );
  if (!subscribeInput) {
    subscribeInput = document.getElementById("widget.cbid.podkop." + section_id + ".subscribe_url");
  }

  var subscribeUrl = subscribeInput ? subscribeInput.value : "";

  // Remove old lists first
  removeConfigLists();

  // If we have a URL, refetch with new mode
  if (subscribeUrl && subscribeUrl.length > 0) {
    var subscribeContainer = subscribeInput.closest(".cbi-value") ||
                             subscribeInput.closest(".cbi-section") ||
                             subscribeInput.parentElement;

    var isUrltest = (newType === "urltest");
    var listId = isUrltest
      ? "podkop-subscribe-config-list-urltest-" + section_id
      : "podkop-subscribe-config-list-" + section_id;

    fetchConfigs(subscribeUrl, subscribeContainer, listId, false, section_id, isUrltest);
  }
}

// Initialize change handlers for dropdowns
function initConfigListHandlers() {
  var connectionTypeSelect = document.querySelector(
    'select[id*="connection_type"]'
  );
  if (!connectionTypeSelect) {
    connectionTypeSelect = document.querySelector(
      'select[name*="connection_type"]'
    );
  }

  if (connectionTypeSelect && !connectionTypeSelect._podkopSubscribeHandler) {
    var handler = function () {
      removeConfigLists();
    };
    connectionTypeSelect.addEventListener("change", handler);
    connectionTypeSelect._podkopSubscribeHandler = handler;
  }

  // Find ALL proxy_config_type selects (for multiple sections)
  var proxyConfigTypeSelects = document.querySelectorAll(
    'select[id*="proxy_config_type"]'
  );

  proxyConfigTypeSelects.forEach(function(select) {
    if (!select._podkopSubscribeHandler) {
      var handler = function () {
        refetchConfigsForSection(select);
      };
      select.addEventListener("change", handler);
      select._podkopSubscribeHandler = handler;
    }
  });
}

// Create error message element
function createErrorMessage(text, small) {
  var div = document.createElement("div");
  div.className = small ? "podkop-subscribe-error-small" : "podkop-subscribe-error";
  if (!small) {
    div.style.marginTop = "10px";
  }
  div.textContent = text;
  return div;
}

// Create success message element
function createSuccessMessage(text) {
  var div = document.createElement("div");
  div.className = "podkop-subscribe-success";
  div.textContent = text;
  return div;
}

// Create warning/loading message element
function createWarningMessage(text) {
  var div = document.createElement("div");
  div.className = "podkop-subscribe-warning";
  div.textContent = text;
  return div;
}

// Find subscribe input field for specific section
function findSubscribeInput(ev, section_id, fieldName) {
  var subscribeInput = null;

  // First try: find by exact section_id in element ID (with widget prefix)
  subscribeInput = document.querySelector(
    "#widget\\.cbid\\.podkop\\." + section_id + "\\." + fieldName
  );
  if (subscribeInput) return subscribeInput;

  // Second try: without widget prefix
  subscribeInput = document.querySelector(
    "#cbid\\.podkop\\." + section_id + "\\." + fieldName
  );
  if (subscribeInput) return subscribeInput;

  // Third try: via button's closest section-node
  if (ev && ev.target) {
    var button = ev.target.closest("button") || ev.target;
    var sectionNode = button.closest(".cbi-section-node");
    if (sectionNode) {
      subscribeInput = sectionNode.querySelector(
        'input[id*="' + section_id + '"][id*="' + fieldName + '"]'
      );
      if (subscribeInput) return subscribeInput;

      subscribeInput = sectionNode.querySelector('input[id*="' + fieldName + '"]');
      if (subscribeInput) return subscribeInput;
    }
  }

  return null;
}

// Get subscribe URL value for specific section
function getSubscribeUrl(ev, section_id, fieldName) {
  // Use findSubscribeInput to get the correct input for this section
  var input = findSubscribeInput(ev, section_id, fieldName);
  if (input && input.value) {
    return input.value;
  }
  return "";
}

// Check if should show config list
function shouldShowConfigList() {
  try {
    var connectionTypeSelect = document.querySelector(
      'select[id*="connection_type"]'
    );
    if (!connectionTypeSelect) {
      connectionTypeSelect = document.querySelector(
        'select[name*="connection_type"]'
      );
    }
    if (connectionTypeSelect && connectionTypeSelect.value === "proxy") {
      return true;
    }
  } catch (e) {
    // ignore
  }
  return false;
}

// Check if config URL contains xhttp transport type
function isXhttpConfig(url) {
  if (!url || typeof url !== "string") return false;
  try {
    // Parse URL parameters
    var queryStart = url.indexOf("?");
    if (queryStart === -1) return false;

    var hashStart = url.indexOf("#");
    var queryString = hashStart > queryStart
      ? url.substring(queryStart + 1, hashStart)
      : url.substring(queryStart + 1);

    var params = queryString.split("&");
    for (var i = 0; i < params.length; i++) {
      var param = params[i].split("=");
      if (param[0] === "type" && param[1] === "xhttp") {
        return true;
      }
    }
  } catch (e) {
    // ignore parsing errors
  }
  return false;
}

// Get current proxy_config_type value
function getCurrentProxyConfigType(section_id) {
  var select = document.querySelector(
    'select[id*="' + section_id + '"][id*="proxy_config_type"]'
  );
  if (!select) {
    select = document.querySelector('select[id*="proxy_config_type"]');
  }
  if (!select) {
    select = document.querySelector('select[name*="proxy_config_type"]');
  }
  return select ? select.value : null;
}

// Create loading indicator
function createLoadingIndicator(id) {
  var loadingIndicator = document.createElement("div");
  loadingIndicator.id = id;
  loadingIndicator.className = "cbi-value";
  loadingIndicator.style.cssText = "margin-top: 10px; margin-bottom: 10px;";

  var loadingLabel = document.createElement("label");
  loadingLabel.className = "cbi-value-title podkop-subscribe-label";
  loadingLabel.textContent = "";
  loadingIndicator.appendChild(loadingLabel);

  var loadingContent = document.createElement("div");
  loadingContent.className = "cbi-value-field podkop-subscribe-field podkop-subscribe-loading";
  loadingContent.textContent = _("Получение конфигураций...");
  loadingIndicator.appendChild(loadingContent);

  return loadingIndicator;
}

// Create config list UI
function createConfigListUI(configs, listId, isOutbound, section_id, isUrltest) {
  var configListContainer = document.createElement("div");
  configListContainer.id = listId;
  configListContainer.className = "cbi-value";

  var shouldShow = shouldShowConfigList();
  configListContainer.style.cssText =
    "margin-top: 15px; margin-bottom: 15px;" +
    (shouldShow ? "" : "display: none;");

  var labelContainer = document.createElement("label");
  labelContainer.className = "cbi-value-title podkop-subscribe-label";
  labelContainer.textContent = _("Доступные конфигурации");
  configListContainer.appendChild(labelContainer);

  var contentContainer = document.createElement("div");
  contentContainer.className = "cbi-value-field podkop-subscribe-field";

  var title = document.createElement("div");
  title.className = "podkop-subscribe-title";

  var titleText;
  if (isOutbound) {
    titleText = _("Нажмите на конфигурацию для применения в Xray");
  } else if (isUrltest) {
    titleText = _("Нажмите на конфигурации для добавления в URLTest (повторный клик - удаление)");
  } else {
    titleText = _("Нажмите на конфигурацию для выбора");
  }
  title.textContent = titleText + " (" + configs.length + ")";

  // Add counter for urltest mode
  if (isUrltest) {
    var counter = document.createElement("span");
    counter.className = "podkop-subscribe-urltest-counter";
    counter.id = "urltest-counter-" + section_id;
    counter.textContent = _("Выбрано: 0");
    title.appendChild(counter);
  }

  contentContainer.appendChild(title);

  var configList = document.createElement("div");
  configList.className = "podkop-subscribe-list";

  // Store for urltest selected configs
  if (isUrltest) {
    configList._urltestSelected = [];
  }

  configs.forEach(function (config, index) {
    var configItem = document.createElement("div");
    configItem.className = "podkop-subscribe-item";

    // Check if this is an xhttp config
    var isXhttp = isXhttpConfig(config.url);
    if (isXhttp && !isOutbound) {
      configItem.classList.add("xhttp-disabled");
    }

    var configTitle = document.createElement("div");
    configTitle.className = "podkop-subscribe-item-title";

    var titleText = config.title || _("Конфигурация") + " " + (index + 1);
    configTitle.textContent = titleText;

    // Add protocol badge
    if (config.protocol) {
      var protocolBadge = document.createElement("span");
      protocolBadge.className = "podkop-subscribe-item-protocol";
      protocolBadge.textContent = config.protocol;
      configTitle.appendChild(protocolBadge);
    }

    // Add xhttp warning badge
    if (isXhttp && !isOutbound) {
      var xhttpBadge = document.createElement("span");
      xhttpBadge.className = "podkop-subscribe-xhttp-badge";
      xhttpBadge.textContent = "XHTTP";
      xhttpBadge.title = _("XHTTP не поддерживается по умолчанию");
      configTitle.appendChild(xhttpBadge);
    }

    configItem.appendChild(configTitle);

    // Store config data on element for urltest
    configItem._configData = config;

    if (isOutbound) {
      configItem.onclick = createOutboundClickHandler(config, configItem, configList);
    } else if (isUrltest) {
      configItem.onclick = createUrltestClickHandler(config, configItem, configList, section_id, isXhttp);
    } else {
      configItem.onclick = createUrlClickHandler(config, configItem, configList, section_id, isXhttp);
    }

    configList.appendChild(configItem);
  });

  contentContainer.appendChild(configList);
  configListContainer.appendChild(contentContainer);

  return configListContainer;
}

// Click handler for URL mode
function createUrlClickHandler(config, configItem, configList, section_id, isXhttp) {
  return function (e) {
    e.stopPropagation();

    // Block xhttp configs
    if (isXhttp) {
      var errorDiv = createErrorMessage(_("XHTTP не поддерживается по умолчанию"), true);
      configItem.appendChild(errorDiv);
      setTimeout(function () {
        if (errorDiv.parentNode) {
          errorDiv.parentNode.removeChild(errorDiv);
        }
      }, 3000);
      return;
    }

    // Find proxy_string textarea for THIS section (section_id specific first)
    var proxyTextarea =
      document.getElementById("widget.cbid.podkop." + section_id + ".proxy_string") ||
      document.getElementById("cbid.podkop." + section_id + ".proxy_string") ||
      document.querySelector('textarea[id*="podkop.' + section_id + '.proxy_string"]');

    if (proxyTextarea) {
      proxyTextarea.value = config.url;
      if (proxyTextarea.dispatchEvent) {
        proxyTextarea.dispatchEvent(new Event("change", { bubbles: true }));
        proxyTextarea.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }

    // Reset all items
    var allItems = configList.querySelectorAll(".podkop-subscribe-item");
    allItems.forEach(function (item) {
      item.classList.remove("selected");
    });

    // Mark selected
    configItem.classList.add("selected");

    var successDiv = createSuccessMessage(_("Конфигурация выбрана"));
    configItem.appendChild(successDiv);
    setTimeout(function () {
      if (successDiv.parentNode) {
        successDiv.parentNode.removeChild(successDiv);
      }
    }, 2000);
  };
}

// Click handler for URLTest mode (multi-select toggle)
function createUrltestClickHandler(config, configItem, configList, section_id, isXhttp) {
  return function (e) {
    e.stopPropagation();

    // Block xhttp configs
    if (isXhttp) {
      var errorDiv = createErrorMessage(_("XHTTP не поддерживается по умолчанию"), true);
      configItem.appendChild(errorDiv);
      setTimeout(function () {
        if (errorDiv.parentNode) {
          errorDiv.parentNode.removeChild(errorDiv);
        }
      }, 3000);
      return;
    }

    // Toggle selection
    var isCurrentlySelected = configItem.classList.contains("urltest-selected");

    if (isCurrentlySelected) {
      // Remove from selection
      configItem.classList.remove("urltest-selected");

      // Remove from array
      var idx = configList._urltestSelected.indexOf(config.url);
      if (idx > -1) {
        configList._urltestSelected.splice(idx, 1);
      }
    } else {
      // Add to selection
      configItem.classList.add("urltest-selected");

      // Add to array
      if (configList._urltestSelected.indexOf(config.url) === -1) {
        configList._urltestSelected.push(config.url);
      }
    }

    // Update counter
    var counter = document.getElementById("urltest-counter-" + section_id);
    if (counter) {
      counter.textContent = _("Выбрано: ") + configList._urltestSelected.length;
    }

    // Update the urltest_proxy_links DynamicList field
    updateUrltestProxyLinks(section_id, configList._urltestSelected);
  };
}

// Update urltest_proxy_links DynamicList field with selected configs
function updateUrltestProxyLinks(section_id, selectedUrls) {
  var baseId = "cbid.podkop." + section_id + ".urltest_proxy_links";

  // Find the DynamicList widget container
  var dynlistWidget = document.querySelector(
    '.cbi-dynlist input[name="' + baseId + '"]'
  );

  if (dynlistWidget) {
    dynlistWidget = dynlistWidget.closest('.cbi-dynlist');
  }

  if (!dynlistWidget) {
    // Try finding by ID
    var widgetId = "widget." + baseId;
    var node = document.getElementById(widgetId);
    if (node) {
      dynlistWidget = node.closest('.cbi-dynlist') || node.parentElement;
    }
  }

  if (!dynlistWidget) {
    console.warn("Could not find urltest_proxy_links for section:", section_id);
    return;
  }

  // Find the text input used for adding items
  var addInput = dynlistWidget.querySelector('input[type="text"]');

  if (!addInput) {
    console.warn("Could not find add input in DynamicList");
    return;
  }

  // Step 1: Remove ALL existing items from DOM
  // Remove .item divs
  var existingItems = dynlistWidget.querySelectorAll('.item');
  existingItems.forEach(function(item) {
    item.parentNode.removeChild(item);
  });

  // Remove hidden inputs with our name
  var existingInputs = document.querySelectorAll('input[type="hidden"][name="' + baseId + '"]');
  existingInputs.forEach(function(input) {
    input.parentNode.removeChild(input);
  });

  // Also remove any inputs inside dynlist with our name
  var dynlistInputs = dynlistWidget.querySelectorAll('input[name="' + baseId + '"]');
  dynlistInputs.forEach(function(input) {
    if (input !== addInput && input.type !== 'text') {
      input.parentNode.removeChild(input);
    }
  });

  // Step 2: Add new items by simulating Enter key
  function addItem(url) {
    addInput.value = url;
    addInput.dispatchEvent(new Event('input', { bubbles: true }));
    addInput.dispatchEvent(new Event('change', { bubbles: true }));

    // Simulate Enter keypress
    var keydownEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true
    });
    addInput.dispatchEvent(keydownEvent);

    var keypressEvent = new KeyboardEvent('keypress', {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true
    });
    addInput.dispatchEvent(keypressEvent);
  }

  // Add items with delay
  var delay = 100; // Start with small delay after clearing
  selectedUrls.forEach(function(url, index) {
    setTimeout(function() {
      addItem(url);
    }, delay);
    delay += 100;
  });

  // Clear input after all items added
  setTimeout(function() {
    addInput.value = '';
    // Trigger change to update form state
    dynlistWidget.dispatchEvent(new Event('change', { bubbles: true }));
  }, delay + 100);
}

// Click handler for Outbound mode
function createOutboundClickHandler(config, configItem, configList) {
  return function (e) {
    e.stopPropagation();

    var loadingText = createWarningMessage(_("Применение конфигурации..."));
    configItem.appendChild(loadingText);

    var xhrConfig = new XMLHttpRequest();
    xhrConfig.open("POST", "/cgi-bin/podkop-xray-config", true);
    xhrConfig.setRequestHeader("Content-Type", "text/plain");

    xhrConfig.onreadystatechange = function () {
      if (xhrConfig.readyState === 4) {
        if (loadingText.parentNode) {
          loadingText.parentNode.removeChild(loadingText);
        }

        if (xhrConfig.status === 200) {
          try {
            JSON.parse(xhrConfig.responseText);

            // Reset all items
            var allItems = configList.querySelectorAll(".podkop-subscribe-item");
            allItems.forEach(function (item) {
              item.classList.remove("selected");
            });

            configItem.classList.add("selected");

            var successDiv = createSuccessMessage(
              _("Конфигурация применена к Xray и служба перезапущена")
            );
            configItem.appendChild(successDiv);
            setTimeout(function () {
              if (successDiv.parentNode) {
                successDiv.parentNode.removeChild(successDiv);
              }
            }, 3000);
          } catch (err) {
            var errorDiv = createErrorMessage(
              _("Ошибка при применении конфигурации: ") + err.message,
              true
            );
            configItem.appendChild(errorDiv);
            setTimeout(function () {
              if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
              }
            }, 5000);
          }
        } else {
          var errorDiv = createErrorMessage(
            _("Ошибка при применении конфигурации: HTTP ") + xhrConfig.status,
            true
          );
          configItem.appendChild(errorDiv);
          setTimeout(function () {
            if (errorDiv.parentNode) {
              errorDiv.parentNode.removeChild(errorDiv);
            }
          }, 5000);
        }
      }
    };

    xhrConfig.onerror = function () {
      if (loadingText.parentNode) {
        loadingText.parentNode.removeChild(loadingText);
      }
      var errorDiv = createErrorMessage(
        _("Ошибка сети при применении конфигурации"),
        true
      );
      configItem.appendChild(errorDiv);
      setTimeout(function () {
        if (errorDiv.parentNode) {
          errorDiv.parentNode.removeChild(errorDiv);
        }
      }, 5000);
    };

    xhrConfig.send(config.url);
  };
}

// Fetch configs handler
function fetchConfigs(subscribeUrl, subscribeContainer, listId, isOutbound, section_id, isUrltest) {
  // Remove old list for this section
  var existingList = document.getElementById(listId);
  if (existingList && existingList.parentNode) {
    existingList.parentNode.removeChild(existingList);
  }

  // Remove old loading indicator for this section
  var loadingSuffix = isOutbound ? "-outbound" : (isUrltest ? "-urltest" : "");
  var loadingId = "podkop-subscribe-loading-" + section_id + loadingSuffix;
  var existingLoading = document.getElementById(loadingId);
  if (existingLoading && existingLoading.parentNode) {
    existingLoading.parentNode.removeChild(existingLoading);
  }

  // Show loading
  var loadingIndicator = null;
  if (subscribeContainer) {
    loadingIndicator = createLoadingIndicator(loadingId);

    if (subscribeContainer.nextSibling) {
      subscribeContainer.parentNode.insertBefore(
        loadingIndicator,
        subscribeContainer.nextSibling
      );
    } else {
      subscribeContainer.parentNode.appendChild(loadingIndicator);
    }
  }

  var xhr = new XMLHttpRequest();
  xhr.open("POST", "/cgi-bin/podkop-subscribe", true);
  xhr.setRequestHeader("Content-Type", "text/plain");

  xhr.onreadystatechange = function () {
    if (xhr.readyState === 4) {
      if (loadingIndicator && loadingIndicator.parentNode) {
        loadingIndicator.parentNode.removeChild(loadingIndicator);
      }

      if (xhr.status === 200) {
        try {
          var result = JSON.parse(xhr.responseText);

          if (result.error) {
            showTemporaryError(subscribeContainer, result.error);
            return;
          }

          if (!result || !result.configs || result.configs.length === 0) {
            showTemporaryError(subscribeContainer, _("Конфигурации не найдены"));
            return;
          }

          var configs = result.configs;
          if (!subscribeContainer) return;

          var configListContainer = createConfigListUI(
            configs,
            listId,
            isOutbound,
            section_id,
            isUrltest
          );

          if (subscribeContainer.nextSibling) {
            subscribeContainer.parentNode.insertBefore(
              configListContainer,
              subscribeContainer.nextSibling
            );
          } else {
            subscribeContainer.parentNode.appendChild(configListContainer);
          }

          setTimeout(function () {
            initConfigListHandlers();
          }, 100);
        } catch (e) {
          showTemporaryError(
            subscribeContainer,
            _("Ошибка при разборе ответа: ") + e.message
          );
        }
      } else {
        showTemporaryError(
          subscribeContainer,
          _("Ошибка при получении конфигураций: HTTP ") + xhr.status
        );
      }
    }
  };

  xhr.onerror = function () {
    if (loadingIndicator && loadingIndicator.parentNode) {
      loadingIndicator.parentNode.removeChild(loadingIndicator);
    }
    showTemporaryError(
      subscribeContainer,
      _("Ошибка сети при получении конфигураций")
    );
  };

  xhr.send(subscribeUrl);
}

// Show temporary error
function showTemporaryError(container, message) {
  var errorDiv = createErrorMessage(message, false);
  if (container && container.nextSibling) {
    container.parentNode.insertBefore(errorDiv, container.nextSibling);
  } else if (container) {
    container.parentNode.appendChild(errorDiv);
  }
  setTimeout(function () {
    if (errorDiv.parentNode) {
      errorDiv.parentNode.removeChild(errorDiv);
    }
  }, 5000);
}

function enhanceSectionWithSubscribe(section) {
  // Inject CSS styles
  injectSubscribeStyles();

  // Initialize handlers after DOM load
  setTimeout(function () {
    initConfigListHandlers();
  }, 500);

  // Subscribe URL for proxy_config_type = "url" and "urltest"
  var o = section.option(
    form.Value,
    "subscribe_url",
    _("Subscribe URL"),
    _("Введите Subscribe URL для получения конфигураций")
  );
  o.depends("proxy_config_type", "url");
  o.depends("proxy_config_type", "urltest");
  o.placeholder = "https://example.com/subscribe";
  o.rmempty = true;

  // Validation
  o.validate = function (section_id, value) {
    if (!value || value.length === 0) {
      return true;
    }
    var validation = main.validateUrl(value);
    if (validation.valid) {
      return true;
    }
    return validation.message;
  };

  // Fetch button for URL mode
  o = section.option(
    form.Button,
    "subscribe_fetch",
    _("Получить конфигурации"),
    _("Получить конфигурации из Subscribe URL")
  );
  o.depends("proxy_config_type", "url");
  o.inputtitle = _("Получить");
  o.inputstyle = "add";

  o.onclick = function (ev, section_id) {
    if (ev && ev.preventDefault) ev.preventDefault();
    if (ev && ev.stopPropagation) ev.stopPropagation();

    var subscribeUrl = getSubscribeUrl(ev, section_id, "subscribe_url");

    if (!subscribeUrl || subscribeUrl.length === 0) {
      ui.addNotification(null, E("p", {}, _("Пожалуйста, введите Subscribe URL")));
      return false;
    }

    var subscribeInput = findSubscribeInput(ev, section_id, "subscribe_url");
    var subscribeContainer = null;
    if (subscribeInput) {
      subscribeContainer =
        subscribeInput.closest(".cbi-value") ||
        subscribeInput.closest(".cbi-section") ||
        subscribeInput.parentElement;
    }

    fetchConfigs(
      subscribeUrl,
      subscribeContainer,
      "podkop-subscribe-config-list-" + section_id,
      false,
      section_id,
      false
    );

    return false;
  };

  // Fetch button for URLTest mode
  o = section.option(
    form.Button,
    "subscribe_fetch_urltest",
    _("Получить конфигурации"),
    _("Получить конфигурации из Subscribe URL для выбора в URLTest")
  );
  o.depends("proxy_config_type", "urltest");
  o.inputtitle = _("Получить");
  o.inputstyle = "add";

  o.onclick = function (ev, section_id) {
    if (ev && ev.preventDefault) ev.preventDefault();
    if (ev && ev.stopPropagation) ev.stopPropagation();

    var subscribeUrl = getSubscribeUrl(ev, section_id, "subscribe_url");

    if (!subscribeUrl || subscribeUrl.length === 0) {
      ui.addNotification(null, E("p", {}, _("Пожалуйста, введите Subscribe URL")));
      return false;
    }

    var subscribeInput = findSubscribeInput(ev, section_id, "subscribe_url");
    var subscribeContainer = null;
    if (subscribeInput) {
      subscribeContainer =
        subscribeInput.closest(".cbi-value") ||
        subscribeInput.closest(".cbi-section") ||
        subscribeInput.parentElement;
    }

    fetchConfigs(
      subscribeUrl,
      subscribeContainer,
      "podkop-subscribe-config-list-urltest-" + section_id,
      false,
      section_id,
      true
    );

    return false;
  };

  // Subscribe URL for proxy_config_type = "outbound"
  o = section.option(
    form.Value,
    "subscribe_url_outbound",
    _("Subscribe URL"),
    _("Введите Subscribe URL для получения конфигураций")
  );
  o.depends("proxy_config_type", "outbound");
  o.placeholder = "https://example.com/subscribe";
  o.rmempty = true;

  o.validate = function (section_id, value) {
    if (!value || value.length === 0) {
      return true;
    }
    var validation = main.validateUrl(value);
    if (validation.valid) {
      return true;
    }
    return validation.message;
  };

  // Fetch button for Outbound mode
  o = section.option(
    form.Button,
    "subscribe_fetch_outbound",
    _("Получить конфигурации"),
    _("Получить конфигурации из Subscribe URL")
  );
  o.depends("proxy_config_type", "outbound");
  o.inputtitle = _("Получить");
  o.inputstyle = "add";

  o.onclick = function (ev, section_id) {
    if (ev && ev.preventDefault) ev.preventDefault();
    if (ev && ev.stopPropagation) ev.stopPropagation();

    var subscribeUrl = getSubscribeUrl(ev, section_id, "subscribe_url_outbound");

    if (!subscribeUrl || subscribeUrl.length === 0) {
      ui.addNotification(
        null,
        E("p", {}, _("Пожалуйста, введите Subscribe URL"))
      );
      return false;
    }

    var subscribeInput = findSubscribeInput(ev, section_id, "subscribe_url_outbound");
    var subscribeContainer = null;
    if (subscribeInput) {
      subscribeContainer =
        subscribeInput.closest(".cbi-value") ||
        subscribeInput.closest(".cbi-section") ||
        subscribeInput.parentElement;
    }

    fetchConfigs(
      subscribeUrl,
      subscribeContainer,
      "podkop-subscribe-config-list-outbound-" + section_id,
      true,
      section_id,
      false
    );

    return false;
  };
}

var EntryPoint = {
  enhanceSectionWithSubscribe: enhanceSectionWithSubscribe,
};

return baseclass.extend(EntryPoint);
