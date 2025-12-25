"use strict";
"require form";
"require baseclass";
"require ui";
"require tools.widgets as widgets";
"require view.podkop.main as main";
"require dom";

function createSectionContent(section) {
  let   o = section.option(
    form.ListValue,
    "connection_type",
    _("Connection Type"),
    _("Select between VPN and Proxy connection methods for traffic routing"),
  );
  o.value("proxy", "Proxy");
  o.value("vpn", "VPN");
  o.value("block", "Block");
  
  // Hide config list when connection type is not "proxy"
  o.onchange = function(ev, section_id, value) {
    const configList = document.getElementById("podkop-subscribe-config-list");
    const configListOutbound = document.getElementById("podkop-subscribe-config-list-outbound");
    if (configList) {
      if (value !== "proxy") {
        configList.style.display = "none";
      } else {
        // Check if proxy_config_type is "url" before showing
        const proxyConfigType = this.section.getOption("proxy_config_type", section_id);
        if (proxyConfigType) {
          const proxyConfigTypeElement = proxyConfigType.getUIElement(section_id);
          if (proxyConfigTypeElement && proxyConfigTypeElement.value === "url") {
            configList.style.display = "";
          }
        }
      }
    }
    if (configListOutbound) {
      if (value !== "proxy") {
        configListOutbound.style.display = "none";
      } else {
        // Check if proxy_config_type is "outbound" before showing
        const proxyConfigType = this.section.getOption("proxy_config_type", section_id);
        if (proxyConfigType) {
          const proxyConfigTypeElement = proxyConfigType.getUIElement(section_id);
          if (proxyConfigTypeElement && proxyConfigTypeElement.value === "outbound") {
            configListOutbound.style.display = "";
          }
        }
      }
    }
  };

  o = section.option(
    form.ListValue,
    "proxy_config_type",
    _("Configuration Type"),
    _("Select how to configure the proxy"),
  );
  o.value("url", _("Connection URL"));
  o.value("outbound", _("Outbound Config"));
  o.value("urltest", _("URLTest"));
  o.default = "url";
  o.depends("connection_type", "proxy");
  
  // Hide config list when proxy_config_type is not "url" or "outbound"
  o.onchange = function(ev, section_id, value) {
    const configList = document.getElementById("podkop-subscribe-config-list");
    const configListOutbound = document.getElementById("podkop-subscribe-config-list-outbound");
    if (configList) {
      if (value !== "url") {
        configList.style.display = "none";
      } else {
        // Check if connection_type is "proxy" before showing
        const connectionType = this.section.getOption("connection_type", section_id);
        if (connectionType) {
          const connectionTypeElement = connectionType.getUIElement(section_id);
          if (connectionTypeElement && connectionTypeElement.value === "proxy") {
            configList.style.display = "";
          }
        }
      }
    }
    if (configListOutbound) {
      if (value !== "outbound") {
        configListOutbound.style.display = "none";
      } else {
        // Check if connection_type is "proxy" before showing
        const connectionType = this.section.getOption("connection_type", section_id);
        if (connectionType) {
          const connectionTypeElement = connectionType.getUIElement(section_id);
          if (connectionTypeElement && connectionTypeElement.value === "proxy") {
            configListOutbound.style.display = "";
          }
        }
      }
    }
  };

  o = section.option(
    form.TextValue,
    "proxy_string",
    _("Proxy Configuration URL"),
    "",
  );
  o.depends("proxy_config_type", "url");
  o.rows = 5;
  // Enable soft wrapping for multi-line proxy URLs (e.g., for URLTest proxy links)
  o.wrap = "soft";
  // Render as a textarea to allow multiple proxy URLs/configs
  o.textarea = true;
  o.rmempty = false;
  o.sectionDescriptions = new Map();
  o.placeholder = "vless://uuid@server:port?type=tcp&security=tls#main";
  o.validate = function (section_id, value) {
    // Optional
    if (!value || value.length === 0) {
      return true;
    }

    const validation = main.validateProxyUrl(value);

    if (validation.valid) {
      return true;
    }

    return validation.message;
  };

  // Subscribe URL field
  o = section.option(
    form.Value,
    "subscribe_url",
    _("Subscribe URL"),
    _("Введите Subscribe URL для получения конфигураций vless"),
  );
  o.depends("proxy_config_type", "url");
  o.placeholder = "https://example.com/subscribe";
  o.rmempty = true;
  
  // Load saved Subscribe URL on page load
  o.load = function(section_id) {
    const field = this;
    // Use XMLHttpRequest to load saved URL
    const xhr = new XMLHttpRequest();
    xhr.open("GET", "/cgi-bin/podkop-subscribe-url", true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4 && xhr.status === 200) {
        try {
          const result = JSON.parse(xhr.responseText);
          if (result && result.url && result.url.length > 0) {
            // Find input field and set value
            setTimeout(function() {
              let subscribeInput = document.getElementById(`widget.cbid.podkop.${section_id}.subscribe_url`) ||
                                  document.getElementById(`cbid.podkop.${section_id}.subscribe_url`) ||
                                  document.querySelector('input[id*="subscribe_url"]');
              if (subscribeInput) {
                subscribeInput.value = result.url;
                // Trigger change event
                if (subscribeInput.dispatchEvent) {
                  subscribeInput.dispatchEvent(new Event('change', { bubbles: true }));
                }
              }
            }, 100);
          }
        } catch(e) {
          // Ignore errors
        }
      }
    };
    xhr.send();
  };
  o.validate = function (section_id, value) {
    if (!value || value.length === 0) {
      return true;
    }

    const validation = main.validateUrl(value);
    if (validation.valid) {
      return true;
    }

    return validation.message;
  };

  // Subscribe button
  o = section.option(
    form.Button,
    "subscribe_fetch",
    _("Получить конфигурации"),
    _("Получить конфигурации vless из Subscribe URL"),
  );
  o.depends("proxy_config_type", "url");
  o.inputtitle = _("Получить");
  o.inputstyle = "add";
  o.onclick = function(ev, section_id) {
    // Prevent form submission
    if (ev && ev.preventDefault) {
      ev.preventDefault();
    }
    if (ev && ev.stopPropagation) {
      ev.stopPropagation();
    }
    
    const subscribeField = this.section.getOption("subscribe_url", section_id);
    const proxyField = this.section.getOption("proxy_string", section_id);
    
    if (!subscribeField) {
      ui.addNotification(null, E("p", {}, _("Поле Subscribe URL не найдено")));
      return false;
    }

    // Get value from DOM element - try multiple methods
    let subscribeUrl = "";
    
    // Method 1: Find by closest parent and search (most reliable - doesn't depend on section_id)
    try {
      const button = ev && ev.target ? ev.target : null;
      if (button) {
        const parentSection = button.closest('.cbi-section');
        if (parentSection) {
          const input = parentSection.querySelector('input[placeholder*="Subscribe"], input[id*="subscribe_url"]');
          if (input) {
            subscribeUrl = input.value || "";
          }
        }
      }
    } catch(e) {
      // Ignore errors
    }
    
    // Method 2: Find by ID (widget.cbid.podkop.{section_id}.subscribe_url)
    if (!subscribeUrl) {
      try {
        const inputById = document.querySelector(`#widget\\.cbid\\.podkop\\.${section_id}\\.subscribe_url`);
        if (inputById) {
          subscribeUrl = inputById.value || "";
        }
      } catch(e) {
        // Ignore errors
      }
    }
    
    // Method 3: Find all inputs with subscribe_url in ID and get the visible one
    if (!subscribeUrl) {
      try {
        const allSubscribeInputs = Array.from(document.querySelectorAll('input[id*="subscribe_url"]'));
        const visibleInput = allSubscribeInputs.find(input => input.offsetParent !== null);
        if (visibleInput) {
          subscribeUrl = visibleInput.value || "";
        }
      } catch(e) {
        // Ignore errors
      }
    }
    
    // Method 4: Find by ID pattern without widget prefix (fallback)
    if (!subscribeUrl) {
      try {
        const inputById = document.querySelector(`#cbid\\.podkop\\.${section_id}\\.subscribe_url`);
        if (inputById) {
          subscribeUrl = inputById.value || "";
        }
      } catch(e) {
        // Ignore errors
      }
    }
    
        if (!subscribeUrl || subscribeUrl.length === 0) {
          ui.addNotification(null, E("p", {}, _("Пожалуйста, введите Subscribe URL")));
          return false;
        }

    // Find the Subscribe URL input field in DOM to insert list below it
    let subscribeInput = null;
    try {
      const button = ev && ev.target ? ev.target : null;
      if (button) {
        const parentSection = button.closest('.cbi-section');
        if (parentSection) {
          subscribeInput = parentSection.querySelector('input[placeholder*="Subscribe"], input[id*="subscribe_url"]');
        }
      }
    } catch(e) {
      // Ignore errors
    }
    
    if (!subscribeInput) {
      try {
        subscribeInput = document.querySelector(`#widget\\.cbid\\.podkop\\.${section_id}\\.subscribe_url`) ||
                         document.querySelector(`#cbid\\.podkop\\.${section_id}\\.subscribe_url`) ||
                         document.querySelector('input[id*="subscribe_url"]');
      } catch(e) {
        // Ignore errors
      }
    }
    
    // Find the container for the Subscribe URL field (usually .cbi-value or .cbi-section)
    let subscribeContainer = null;
    if (subscribeInput) {
      subscribeContainer = subscribeInput.closest('.cbi-value') || 
                          subscribeInput.closest('.cbi-section') ||
                          subscribeInput.parentElement;
    }
    
    // Remove existing config list if present
    const existingList = document.getElementById("podkop-subscribe-config-list");
    if (existingList && existingList.parentNode) {
      existingList.parentNode.removeChild(existingList);
    }
    
    // Create loading indicator directly in DOM (not using ui.addNotification to avoid LuCI reload)
    let loadingIndicator = null;
    if (subscribeContainer) {
      // Create container with same structure as other fields
      loadingIndicator = document.createElement("div");
      loadingIndicator.id = "podkop-subscribe-loading";
      loadingIndicator.className = "cbi-value";
      loadingIndicator.style.cssText = "margin-top: 10px; margin-bottom: 10px;";
      
      // Create label container (same as Subscribe URL structure)
      const loadingLabel = document.createElement("label");
      loadingLabel.className = "cbi-value-title";
      loadingLabel.style.cssText = "width: 200px; padding-right: 10px; display: inline-block; vertical-align: top;";
      loadingLabel.textContent = "";
      loadingIndicator.appendChild(loadingLabel);
      
      // Create content container
      const loadingContent = document.createElement("div");
      loadingContent.className = "cbi-value-field";
      loadingContent.style.cssText = "display: inline-block; width: calc(100% - 220px); padding: 10px; background: #e3f2fd; border: 1px solid #2196f3; border-radius: 4px; color: #1976d2;";
          loadingContent.textContent = _("Получение конфигураций...");
      loadingIndicator.appendChild(loadingContent);
      
      if (subscribeContainer.nextSibling) {
        subscribeContainer.parentNode.insertBefore(loadingIndicator, subscribeContainer.nextSibling);
      } else {
        subscribeContainer.parentNode.appendChild(loadingIndicator);
      }
    }

    // Use XMLHttpRequest instead of fetch to avoid LuCI interference
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/cgi-bin/podkop-subscribe", true);
    xhr.setRequestHeader("Content-Type", "text/plain");
    
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        // Remove loading indicator
        if (loadingIndicator && loadingIndicator.parentNode) {
          loadingIndicator.parentNode.removeChild(loadingIndicator);
        }
        
        if (xhr.status === 200) {
          try {
            const result = JSON.parse(xhr.responseText);

                if (!result || !result.configs || result.configs.length === 0) {
                  // Show error in DOM instead of notification
                  const errorDiv = document.createElement("div");
                  errorDiv.style.cssText = "margin-top: 10px; padding: 10px; background: #ffebee; border: 1px solid #f44336; border-radius: 4px; color: #c62828;";
                  errorDiv.textContent = _("Конфигурации не найдены");
              if (subscribeContainer && subscribeContainer.nextSibling) {
                subscribeContainer.parentNode.insertBefore(errorDiv, subscribeContainer.nextSibling);
              } else if (subscribeContainer) {
                subscribeContainer.parentNode.appendChild(errorDiv);
              }
              setTimeout(function() {
                if (errorDiv.parentNode) {
                  errorDiv.parentNode.removeChild(errorDiv);
                }
              }, 3000);
              return;
            }

            // Create config list container below Subscribe URL field
            const configs = result.configs;
            
            if (!subscribeContainer) {
              return;
            }
            
            // Create container for config list with label structure similar to Subscribe URL
            const configListContainer = document.createElement("div");
            configListContainer.id = "podkop-subscribe-config-list";
            configListContainer.className = "cbi-value";
            
            // Check if connection_type is "proxy" and proxy_config_type is "url" before showing
            // Use DOM queries instead of LuCI API for more reliable checking
            // Since the button is only visible when connection_type=proxy and proxy_config_type=url,
            // we can safely show the list by default
            let shouldShow = true;
            try {
              // Find connection_type select element - try multiple selectors
              let connectionTypeSelect = document.querySelector(`select[id*="connection_type"]`);
              if (!connectionTypeSelect) {
                connectionTypeSelect = document.querySelector(`select[name*="connection_type"]`);
              }
              
              let proxyConfigTypeSelect = document.querySelector(`select[id*="proxy_config_type"]`);
              if (!proxyConfigTypeSelect) {
                proxyConfigTypeSelect = document.querySelector(`select[name*="proxy_config_type"]`);
              }
              
              // Only hide if we found both selects and they have wrong values
              if (connectionTypeSelect && proxyConfigTypeSelect) {
                if (connectionTypeSelect.value !== "proxy" || proxyConfigTypeSelect.value !== "url") {
                  shouldShow = false;
                }
              }
              // If we can't find the selects, show by default (button is visible, so conditions are met)
            } catch(e) {
              // If we can't check, show by default
              shouldShow = true;
            }
            
            configListContainer.style.cssText = "margin-top: 15px; margin-bottom: 15px;" + 
              (shouldShow ? "" : "display: none;");
            
                // Create label container (similar to LuCI form structure)
                const labelContainer = document.createElement("label");
                labelContainer.className = "cbi-value-title";
                labelContainer.style.cssText = "width: 200px; padding-right: 10px; display: inline-block; vertical-align: top;";
                labelContainer.textContent = _("Доступные конфигурации");
            configListContainer.appendChild(labelContainer);
            
            // Create content container
            const contentContainer = document.createElement("div");
            contentContainer.className = "cbi-value-field";
            contentContainer.style.cssText = "display: inline-block; width: calc(100% - 220px);";
            
            const title = document.createElement("div");
            title.style.cssText = "margin-bottom: 10px; font-size: 14px; color: #666;"; // Removed font-weight: bold
            title.textContent = _("Нажмите на конфигурацию для выбора") + " (" + configs.length + ")";
            contentContainer.appendChild(title);
            
            const configList = document.createElement("div");
            configList.style.cssText = "max-height: 300px; overflow-y: auto; padding: 15px; border: 1px solid #ddd; border-radius: 4px; background: #f9f9f9;";
            
            configs.forEach(function(config, index) {
        const configItem = document.createElement("div");
        configItem.style.cssText = "margin: 8px 0; padding: 10px; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; transition: background 0.2s; background: white;";
        
        configItem.onmouseover = function() {
          this.style.background = "#e8f4f8";
          this.style.borderColor = "#0078d4";
        };
        configItem.onmouseout = function() {
          this.style.background = "white";
          this.style.borderColor = "#ccc";
        };
        
                  const configTitle = document.createElement("div");
                  configTitle.style.cssText = "font-weight: bold; margin-bottom: 3px; font-size: 13px;";
                  configTitle.textContent = config.title || _("Конфигурация") + " " + (index + 1);
        configItem.appendChild(configTitle);
        
              // Add click handler
              configItem.onclick = function(e) {
                e.stopPropagation();
                // Find textarea by ID
                let proxyTextarea = document.getElementById("widget.cbid.podkop.main.proxy_string");
                // If not found, try alternative ID patterns
                if (!proxyTextarea) {
                  proxyTextarea = document.querySelector('textarea[id*="proxy_string"]');
                }
                if (!proxyTextarea) {
                  // Try to find by section_id
                  proxyTextarea = document.getElementById(`widget.cbid.podkop.${section_id}.proxy_string`);
                }
                if (!proxyTextarea) {
                  // Try without widget prefix
                  proxyTextarea = document.getElementById(`cbid.podkop.main.proxy_string`);
                }
                if (!proxyTextarea) {
                  // Try with section_id
                  proxyTextarea = document.getElementById(`cbid.podkop.${section_id}.proxy_string`);
                }
                
                if (proxyTextarea) {
                  proxyTextarea.value = config.url;
                  // Trigger change event to update the form
                  if (proxyTextarea.dispatchEvent) {
                    proxyTextarea.dispatchEvent(new Event('change', { bubbles: true }));
                    proxyTextarea.dispatchEvent(new Event('input', { bubbles: true }));
                  }
                  // Highlight selected config
                  const allItems = configList.querySelectorAll('div[style*="cursor: pointer"]');
                  allItems.forEach(function(item) {
                    item.style.background = "white";
                    item.style.borderColor = "#ccc";
                  });
                  configItem.style.background = "#d4edda";
                  configItem.style.borderColor = "#28a745";
                      // Show success message in DOM instead of notification
                      const successDiv = document.createElement("div");
                      successDiv.style.cssText = "margin-top: 5px; padding: 5px; background: #d4edda; border: 1px solid #28a745; border-radius: 4px; color: #155724; font-size: 12px;";
                      successDiv.textContent = _("Конфигурация выбрана");
                  configItem.appendChild(successDiv);
                  setTimeout(function() {
                    if (successDiv.parentNode) {
                      successDiv.parentNode.removeChild(successDiv);
                    }
                  }, 2000);
                }
              };
              
              configList.appendChild(configItem);
            });
            
            contentContainer.appendChild(configList);
            configListContainer.appendChild(contentContainer);
            
            // Insert config list after Subscribe URL field container
            if (subscribeContainer.nextSibling) {
              subscribeContainer.parentNode.insertBefore(configListContainer, subscribeContainer.nextSibling);
            } else {
              subscribeContainer.parentNode.appendChild(configListContainer);
            }
            
            // Save Subscribe URL to file
            const saveUrlXhr = new XMLHttpRequest();
            saveUrlXhr.open("POST", "/cgi-bin/podkop-subscribe-url", true);
            saveUrlXhr.setRequestHeader("Content-Type", "text/plain");
            saveUrlXhr.send(subscribeUrl);
              } catch(e) {
                // Show error in DOM
                const errorDiv = document.createElement("div");
                errorDiv.style.cssText = "margin-top: 10px; padding: 10px; background: #ffebee; border: 1px solid #f44336; border-radius: 4px; color: #c62828;";
                errorDiv.textContent = _("Ошибка при разборе ответа: ") + e.message;
            if (subscribeContainer && subscribeContainer.nextSibling) {
              subscribeContainer.parentNode.insertBefore(errorDiv, subscribeContainer.nextSibling);
            } else if (subscribeContainer) {
              subscribeContainer.parentNode.appendChild(errorDiv);
            }
            setTimeout(function() {
              if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
              }
            }, 5000);
          }
            } else {
              // Show error in DOM
              const errorDiv = document.createElement("div");
              errorDiv.style.cssText = "margin-top: 10px; padding: 10px; background: #ffebee; border: 1px solid #f44336; border-radius: 4px; color: #c62828;";
              errorDiv.textContent = _("Ошибка при получении конфигураций: HTTP ") + xhr.status;
          if (subscribeContainer && subscribeContainer.nextSibling) {
            subscribeContainer.parentNode.insertBefore(errorDiv, subscribeContainer.nextSibling);
          } else if (subscribeContainer) {
            subscribeContainer.parentNode.appendChild(errorDiv);
          }
          setTimeout(function() {
            if (errorDiv.parentNode) {
              errorDiv.parentNode.removeChild(errorDiv);
            }
          }, 5000);
        }
      }
    };
    
    xhr.onerror = function() {
      // Remove loading indicator
      if (loadingIndicator && loadingIndicator.parentNode) {
        loadingIndicator.parentNode.removeChild(loadingIndicator);
      }
          // Show error in DOM
          const errorDiv = document.createElement("div");
          errorDiv.style.cssText = "margin-top: 10px; padding: 10px; background: #ffebee; border: 1px solid #f44336; border-radius: 4px; color: #c62828;";
          errorDiv.textContent = _("Ошибка сети при получении конфигураций");
      if (subscribeContainer && subscribeContainer.nextSibling) {
        subscribeContainer.parentNode.insertBefore(errorDiv, subscribeContainer.nextSibling);
      } else if (subscribeContainer) {
        subscribeContainer.parentNode.appendChild(errorDiv);
      }
      setTimeout(function() {
        if (errorDiv.parentNode) {
          errorDiv.parentNode.removeChild(errorDiv);
        }
      }, 5000);
    };
    
    xhr.send(subscribeUrl);

    return false;
  };

  // Subscribe URL field for outbound
  o = section.option(
    form.Value,
    "subscribe_url_outbound",
    _("Subscribe URL"),
    _("Введите Subscribe URL для получения конфигураций vless"),
  );
  o.depends("proxy_config_type", "outbound");
  o.placeholder = "https://example.com/subscribe";
  o.rmempty = true;
  
  // Load saved Subscribe URL on page load for outbound
  o.load = function(section_id) {
    const field = this;
    const xhr = new XMLHttpRequest();
    xhr.open("GET", "/cgi-bin/podkop-subscribe-url", true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4 && xhr.status === 200) {
        try {
          const result = JSON.parse(xhr.responseText);
          if (result && result.url && result.url.length > 0) {
            setTimeout(function() {
              let subscribeInput = document.getElementById(`widget.cbid.podkop.${section_id}.subscribe_url_outbound`) ||
                                  document.getElementById(`cbid.podkop.${section_id}.subscribe_url_outbound`) ||
                                  document.querySelector('input[id*="subscribe_url_outbound"]');
              if (subscribeInput) {
                subscribeInput.value = result.url;
                if (subscribeInput.dispatchEvent) {
                  subscribeInput.dispatchEvent(new Event('change', { bubbles: true }));
                }
              }
            }, 100);
          }
        } catch(e) {
          // Ignore errors
        }
      }
    };
    xhr.send();
  };
  o.validate = function (section_id, value) {
    if (!value || value.length === 0) {
      return true;
    }
    const validation = main.validateUrl(value);
    if (validation.valid) {
      return true;
    }
    return validation.message;
  };

  // Subscribe button for outbound
  o = section.option(
    form.Button,
    "subscribe_fetch_outbound",
    _("Получить конфигурации"),
    _("Получить конфигурации vless из Subscribe URL"),
  );
  o.depends("proxy_config_type", "outbound");
  o.inputtitle = _("Получить");
  o.inputstyle = "add";
  o.onclick = function(ev, section_id) {
    if (ev && ev.preventDefault) {
      ev.preventDefault();
    }
    if (ev && ev.stopPropagation) {
      ev.stopPropagation();
    }
    
    let subscribeUrl = "";
    try {
      const button = ev && ev.target ? ev.target : null;
      if (button) {
        const parentSection = button.closest('.cbi-section');
        if (parentSection) {
          const input = parentSection.querySelector('input[placeholder*="Subscribe"], input[id*="subscribe_url_outbound"]');
          if (input) {
            subscribeUrl = input.value || "";
          }
        }
      }
    } catch(e) {
      // Ignore errors
    }
    
    if (!subscribeUrl) {
      try {
        const inputById = document.querySelector(`#widget\\.cbid\\.podkop\\.${section_id}\\.subscribe_url_outbound`);
        if (inputById) {
          subscribeUrl = inputById.value || "";
        }
      } catch(e) {
        // Ignore errors
      }
    }
    
    if (!subscribeUrl || subscribeUrl.length === 0) {
      ui.addNotification(null, E("p", {}, _("Пожалуйста, введите Subscribe URL")));
      return false;
    }

    let subscribeInput = null;
    try {
      const button = ev && ev.target ? ev.target : null;
      if (button) {
        const parentSection = button.closest('.cbi-section');
        if (parentSection) {
          subscribeInput = parentSection.querySelector('input[placeholder*="Subscribe"], input[id*="subscribe_url_outbound"]');
        }
      }
    } catch(e) {
      // Ignore errors
    }
    
    if (!subscribeInput) {
      try {
        subscribeInput = document.querySelector(`#widget\\.cbid\\.podkop\\.${section_id}\\.subscribe_url_outbound`) ||
                         document.querySelector(`#cbid\\.podkop\\.${section_id}\\.subscribe_url_outbound`) ||
                         document.querySelector('input[id*="subscribe_url_outbound"]');
      } catch(e) {
        // Ignore errors
      }
    }
    
    let subscribeContainer = null;
    if (subscribeInput) {
      subscribeContainer = subscribeInput.closest('.cbi-value') || 
                          subscribeInput.closest('.cbi-section') ||
                          subscribeInput.parentElement;
    }
    
    const existingList = document.getElementById("podkop-subscribe-config-list-outbound");
    if (existingList && existingList.parentNode) {
      existingList.parentNode.removeChild(existingList);
    }
    
    let loadingIndicator = null;
    if (subscribeContainer) {
      loadingIndicator = document.createElement("div");
      loadingIndicator.id = "podkop-subscribe-loading-outbound";
      loadingIndicator.className = "cbi-value";
      loadingIndicator.style.cssText = "margin-top: 10px; margin-bottom: 10px;";
      
      const loadingLabel = document.createElement("label");
      loadingLabel.className = "cbi-value-title";
      loadingLabel.style.cssText = "width: 200px; padding-right: 10px; display: inline-block; vertical-align: top;";
      loadingLabel.textContent = "";
      loadingIndicator.appendChild(loadingLabel);
      
      const loadingContent = document.createElement("div");
      loadingContent.className = "cbi-value-field";
      loadingContent.style.cssText = "display: inline-block; width: calc(100% - 220px); padding: 10px; background: #e3f2fd; border: 1px solid #2196f3; border-radius: 4px; color: #1976d2;";
      loadingContent.textContent = _("Получение конфигураций...");
      loadingIndicator.appendChild(loadingContent);
      
      if (subscribeContainer.nextSibling) {
        subscribeContainer.parentNode.insertBefore(loadingIndicator, subscribeContainer.nextSibling);
      } else {
        subscribeContainer.parentNode.appendChild(loadingIndicator);
      }
    }

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/cgi-bin/podkop-subscribe", true);
    xhr.setRequestHeader("Content-Type", "text/plain");
    
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (loadingIndicator && loadingIndicator.parentNode) {
          loadingIndicator.parentNode.removeChild(loadingIndicator);
        }
        
        if (xhr.status === 200) {
          try {
            const result = JSON.parse(xhr.responseText);

            if (!result || !result.configs || result.configs.length === 0) {
              const errorDiv = document.createElement("div");
              errorDiv.style.cssText = "margin-top: 10px; padding: 10px; background: #ffebee; border: 1px solid #f44336; border-radius: 4px; color: #c62828;";
              errorDiv.textContent = _("Конфигурации не найдены");
              if (subscribeContainer && subscribeContainer.nextSibling) {
                subscribeContainer.parentNode.insertBefore(errorDiv, subscribeContainer.nextSibling);
              } else if (subscribeContainer) {
                subscribeContainer.parentNode.appendChild(errorDiv);
              }
              setTimeout(function() {
                if (errorDiv.parentNode) {
                  errorDiv.parentNode.removeChild(errorDiv);
                }
              }, 3000);
              return;
            }

            const configs = result.configs;
            
            if (!subscribeContainer) {
              return;
            }
            
            const configListContainer = document.createElement("div");
            configListContainer.id = "podkop-subscribe-config-list-outbound";
            configListContainer.className = "cbi-value";
            configListContainer.style.cssText = "margin-top: 15px; margin-bottom: 15px;";
            
            const labelContainer = document.createElement("label");
            labelContainer.className = "cbi-value-title";
            labelContainer.style.cssText = "width: 200px; padding-right: 10px; display: inline-block; vertical-align: top;";
            labelContainer.textContent = _("Доступные конфигурации");
            configListContainer.appendChild(labelContainer);
            
            const contentContainer = document.createElement("div");
            contentContainer.className = "cbi-value-field";
            contentContainer.style.cssText = "display: inline-block; width: calc(100% - 220px);";
            
            const title = document.createElement("div");
            title.style.cssText = "margin-bottom: 10px; font-size: 14px; color: #666;";
            title.textContent = _("Нажмите на конфигурацию для применения в Xray") + " (" + configs.length + ")";
            contentContainer.appendChild(title);
            
            const configList = document.createElement("div");
            configList.style.cssText = "max-height: 300px; overflow-y: auto; padding: 15px; border: 1px solid #ddd; border-radius: 4px; background: #f9f9f9;";
            
            configs.forEach(function(config, index) {
              const configItem = document.createElement("div");
              configItem.style.cssText = "margin: 8px 0; padding: 10px; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; transition: background 0.2s; background: white;";
              
              configItem.onmouseover = function() {
                this.style.background = "#e8f4f8";
                this.style.borderColor = "#0078d4";
              };
              configItem.onmouseout = function() {
                if (!this.classList.contains('selected')) {
                  this.style.background = "white";
                  this.style.borderColor = "#ccc";
                }
              };
              
              const configTitle = document.createElement("div");
              configTitle.style.cssText = "font-weight: bold; margin-bottom: 3px; font-size: 13px;";
              configTitle.textContent = config.title || _("Конфигурация") + " " + (index + 1);
              configItem.appendChild(configTitle);
              
              configItem.onclick = function(e) {
                e.stopPropagation();
                
                // Show loading on this item
                const loadingText = document.createElement("div");
                loadingText.style.cssText = "margin-top: 5px; padding: 5px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; color: #856404; font-size: 12px;";
                loadingText.textContent = _("Применение конфигурации...");
                configItem.appendChild(loadingText);
                
                // Call xray config CGI
                const xhrConfig = new XMLHttpRequest();
                xhrConfig.open("POST", "/cgi-bin/podkop-xray-config", true);
                xhrConfig.setRequestHeader("Content-Type", "text/plain");
                
                xhrConfig.onreadystatechange = function() {
                  if (xhrConfig.readyState === 4) {
                    if (loadingText.parentNode) {
                      loadingText.parentNode.removeChild(loadingText);
                    }
                    
                    if (xhrConfig.status === 200) {
                      try {
                        const result = JSON.parse(xhrConfig.responseText);
                        
                        // Highlight selected config
                        const allItems = configList.querySelectorAll('div[style*="cursor: pointer"]');
                        allItems.forEach(function(item) {
                          item.classList.remove('selected');
                          item.style.background = "white";
                          item.style.borderColor = "#ccc";
                        });
                        configItem.classList.add('selected');
                        configItem.style.background = "#d4edda";
                        configItem.style.borderColor = "#28a745";
                        
                        const successDiv = document.createElement("div");
                        successDiv.style.cssText = "margin-top: 5px; padding: 5px; background: #d4edda; border: 1px solid #28a745; border-radius: 4px; color: #155724; font-size: 12px;";
                        successDiv.textContent = _("Конфигурация применена к Xray и служба перезапущена");
                        configItem.appendChild(successDiv);
                        setTimeout(function() {
                          if (successDiv.parentNode) {
                            successDiv.parentNode.removeChild(successDiv);
                          }
                        }, 3000);
                      } catch(e) {
                        const errorDiv = document.createElement("div");
                        errorDiv.style.cssText = "margin-top: 5px; padding: 5px; background: #ffebee; border: 1px solid #f44336; border-radius: 4px; color: #c62828; font-size: 12px;";
                        errorDiv.textContent = _("Ошибка при применении конфигурации: ") + e.message;
                        configItem.appendChild(errorDiv);
                        setTimeout(function() {
                          if (errorDiv.parentNode) {
                            errorDiv.parentNode.removeChild(errorDiv);
                          }
                        }, 5000);
                      }
                    } else {
                      const errorDiv = document.createElement("div");
                      errorDiv.style.cssText = "margin-top: 5px; padding: 5px; background: #ffebee; border: 1px solid #f44336; border-radius: 4px; color: #c62828; font-size: 12px;";
                      errorDiv.textContent = _("Ошибка при применении конфигурации: HTTP ") + xhrConfig.status;
                      configItem.appendChild(errorDiv);
                      setTimeout(function() {
                        if (errorDiv.parentNode) {
                          errorDiv.parentNode.removeChild(errorDiv);
                        }
                      }, 5000);
                    }
                  }
                };
                
                xhrConfig.onerror = function() {
                  if (loadingText.parentNode) {
                    loadingText.parentNode.removeChild(loadingText);
                  }
                  const errorDiv = document.createElement("div");
                  errorDiv.style.cssText = "margin-top: 5px; padding: 5px; background: #ffebee; border: 1px solid #f44336; border-radius: 4px; color: #c62828; font-size: 12px;";
                  errorDiv.textContent = _("Ошибка сети при применении конфигурации");
                  configItem.appendChild(errorDiv);
                  setTimeout(function() {
                    if (errorDiv.parentNode) {
                      errorDiv.parentNode.removeChild(errorDiv);
                    }
                  }, 5000);
                };
                
                xhrConfig.send(config.url);
              };
              
              configList.appendChild(configItem);
            });
            
            contentContainer.appendChild(configList);
            configListContainer.appendChild(contentContainer);
            
            if (subscribeContainer.nextSibling) {
              subscribeContainer.parentNode.insertBefore(configListContainer, subscribeContainer.nextSibling);
            } else {
              subscribeContainer.parentNode.appendChild(configListContainer);
            }
            
            // Save Subscribe URL to file
            const saveUrlXhr = new XMLHttpRequest();
            saveUrlXhr.open("POST", "/cgi-bin/podkop-subscribe-url", true);
            saveUrlXhr.setRequestHeader("Content-Type", "text/plain");
            saveUrlXhr.send(subscribeUrl);
          } catch(e) {
            const errorDiv = document.createElement("div");
            errorDiv.style.cssText = "margin-top: 10px; padding: 10px; background: #ffebee; border: 1px solid #f44336; border-radius: 4px; color: #c62828;";
            errorDiv.textContent = _("Ошибка при разборе ответа: ") + e.message;
            if (subscribeContainer && subscribeContainer.nextSibling) {
              subscribeContainer.parentNode.insertBefore(errorDiv, subscribeContainer.nextSibling);
            } else if (subscribeContainer) {
              subscribeContainer.parentNode.appendChild(errorDiv);
            }
            setTimeout(function() {
              if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
              }
            }, 5000);
          }
        } else {
          const errorDiv = document.createElement("div");
          errorDiv.style.cssText = "margin-top: 10px; padding: 10px; background: #ffebee; border: 1px solid #f44336; border-radius: 4px; color: #c62828;";
          errorDiv.textContent = _("Ошибка при получении конфигураций: HTTP ") + xhr.status;
          if (subscribeContainer && subscribeContainer.nextSibling) {
            subscribeContainer.parentNode.insertBefore(errorDiv, subscribeContainer.nextSibling);
          } else if (subscribeContainer) {
            subscribeContainer.parentNode.appendChild(errorDiv);
          }
          setTimeout(function() {
            if (errorDiv.parentNode) {
              errorDiv.parentNode.removeChild(errorDiv);
            }
          }, 5000);
        }
      }
    };
    
    xhr.onerror = function() {
      if (loadingIndicator && loadingIndicator.parentNode) {
        loadingIndicator.parentNode.removeChild(loadingIndicator);
      }
      const errorDiv = document.createElement("div");
      errorDiv.style.cssText = "margin-top: 10px; padding: 10px; background: #ffebee; border: 1px solid #f44336; border-radius: 4px; color: #c62828;";
      errorDiv.textContent = _("Ошибка сети при получении конфигураций");
      if (subscribeContainer && subscribeContainer.nextSibling) {
        subscribeContainer.parentNode.insertBefore(errorDiv, subscribeContainer.nextSibling);
      } else if (subscribeContainer) {
        subscribeContainer.parentNode.appendChild(errorDiv);
      }
      setTimeout(function() {
        if (errorDiv.parentNode) {
          errorDiv.parentNode.removeChild(errorDiv);
        }
      }, 5000);
    };
    
    xhr.send(subscribeUrl);

    return false;
  };

  o = section.option(
    form.TextValue,
    "outbound_json",
    _("Outbound Configuration"),
    _("Enter complete outbound configuration in JSON format"),
  );
  o.depends("proxy_config_type", "outbound");
  o.rows = 10;
  o.validate = function (section_id, value) {
    // Optional
    if (!value || value.length === 0) {
      return true;
    }

    const validation = main.validateOutboundJson(value);

    if (validation.valid) {
      return true;
    }

    return validation.message;
  };

  o = section.option(
    form.DynamicList,
    "urltest_proxy_links",
    _("URLTest Proxy Links"),
  );
  o.depends("proxy_config_type", "urltest");
  o.placeholder = "vless://, ss://, trojan://, socks4/5://, hy2/hysteria2:// links";
  o.rmempty = false;
  o.validate = function (section_id, value) {
    // Optional
    if (!value || value.length === 0) {
      return true;
    }

    const validation = main.validateProxyUrl(value);

    if (validation.valid) {
      return true;
    }

    return validation.message;
  };

  o = section.option(
    form.ListValue,
    "urltest_check_interval",
    _("URLTest Check Interval"),
    _("The interval between connectivity tests")
  );
  o.value("30s", _("Every 30 seconds"));
  o.value("1m", _("Every 1 minute"));
  o.value("3m", _("Every 3 minutes"));
  o.value("5m", _("Every 5 minutes"));
  o.default = "3m";
  o.depends("proxy_config_type", "urltest");

  o = section.option(
    form.Value,
    "urltest_tolerance",
    _("URLTest Tolerance"),
    _("The maximum difference in response times (ms) allowed when comparing servers")
  );
  o.default = "50";
  o.rmempty = false;
  o.depends("proxy_config_type", "urltest");
  o.validate = function (section_id, value) {
    if (!value || value.length === 0) {
      return true;
    }

    const parsed = parseFloat(value);

    if (/^[0-9]+$/.test(value) && !isNaN(parsed) && isFinite(parsed) && parsed >= 50 && parsed <= 1000) {
      return true;
    }

    return _('Must be a number in the range of 50 - 1000');
  };

  o = section.option(
    form.Value,
    "urltest_testing_url",
    _("URLTest Testing URL"),
    _("The URL used to test server connectivity")
  );
  o.value("https://www.gstatic.com/generate_204", "https://www.gstatic.com/generate_204 (Google)");
  o.value("https://cp.cloudflare.com/generate_204", "https://cp.cloudflare.com/generate_204 (Cloudflare)");
  o.value("https://captive.apple.com", "https://captive.apple.com (Apple)");
  o.value("https://connectivity-check.ubuntu.com", "https://connectivity-check.ubuntu.com (Ubuntu)")
  o.default = "https://www.gstatic.com/generate_204";
  o.rmempty = false;
  o.depends("proxy_config_type", "urltest");

  o.validate = function (section_id, value) {
    if (!value || value.length === 0) {
      return true;
    }

    const validation = main.validateUrl(value);

    if (validation.valid) {
      return true;
    }

    return validation.message;
  };

  o = section.option(
    form.Flag,
    "enable_udp_over_tcp",
    _("UDP over TCP"),
    _("Applicable for SOCKS and Shadowsocks proxy"),
  );
  o.default = "0";
  o.depends("connection_type", "proxy");
  o.rmempty = false;

  o = section.option(
    widgets.DeviceSelect,
    "interface",
    _("Network Interface"),
    _("Select network interface for VPN connection"),
  );
  o.depends("connection_type", "vpn");
  o.noaliases = true;
  o.nobridges = false;
  o.noinactive = false;
  o.filter = function (section_id, value) {
    // Blocked interface names that should never be selectable
    const blockedInterfaces = [
      "br-lan",
      "eth0",
      "eth1",
      "wan",
      "phy0-ap0",
      "phy1-ap0",
      "pppoe-wan",
      "lan",
    ];

    // Reject immediately if the value matches any blocked interface
    if (blockedInterfaces.includes(value)) {
      return false;
    }

    // Try to find the device object with the given name
    const device = this.devices.find((dev) => dev.getName() === value);

    // If no device is found, allow the value
    if (!device) {
      return true;
    }

    // Get the device type (e.g., "wifi", "ethernet", etc.)
    const type = device.getType();

    // Reject wireless-related devices
    const isWireless =
      type === "wifi" || type === "wireless" || type.includes("wlan");

    return !isWireless;
  };

  o = section.option(
    form.Flag,
    "domain_resolver_enabled",
    _("Domain Resolver"),
    _("Enable built-in DNS resolver for domains handled by this section"),
  );
  o.default = "0";
  o.rmempty = false;
  o.depends("connection_type", "vpn");

  o = section.option(
    form.ListValue,
    "domain_resolver_dns_type",
    _("DNS Protocol Type"),
    _("Select the DNS protocol type for the domain resolver"),
  );
  o.value("doh", _("DNS over HTTPS (DoH)"));
  o.value("dot", _("DNS over TLS (DoT)"));
  o.value("udp", _("UDP (Unprotected DNS)"));
  o.default = "udp";
  o.rmempty = false;
  o.depends("domain_resolver_enabled", "1");

  o = section.option(
    form.Value,
    "domain_resolver_dns_server",
    _("DNS Server"),
    _("Select or enter DNS server address"),
  );
  Object.entries(main.DNS_SERVER_OPTIONS).forEach(([key, label]) => {
    o.value(key, _(label));
  });
  o.default = "8.8.8.8";
  o.rmempty = false;
  o.depends("domain_resolver_enabled", "1");
  o.validate = function (section_id, value) {
    const validation = main.validateDNS(value);

    if (validation.valid) {
      return true;
    }

    return validation.message;
  };

  o = section.option(
    form.DynamicList,
    "community_lists",
    _("Community Lists"),
    _("Select a predefined list for routing") +
      ' <a href="https://github.com/itdoginfo/allow-domains" target="_blank">github.com/itdoginfo/allow-domains</a>',
  );
  o.placeholder = "Service list";
  Object.entries(main.DOMAIN_LIST_OPTIONS).forEach(([key, label]) => {
    o.value(key, _(label));
  });
  o.rmempty = true;
  let lastValues = [];
  let isProcessing = false;

  o.onchange = function (ev, section_id, value) {
    if (isProcessing) return;
    isProcessing = true;

    try {
      const values = Array.isArray(value) ? value : [value];
      let newValues = [...values];
      let notifications = [];

      const selectedRegionalOptions = main.REGIONAL_OPTIONS.filter((opt) =>
        newValues.includes(opt),
      );

      if (selectedRegionalOptions.length > 1) {
        const lastSelected =
          selectedRegionalOptions[selectedRegionalOptions.length - 1];
        const removedRegions = selectedRegionalOptions.slice(0, -1);
        newValues = newValues.filter(
          (v) => v === lastSelected || !main.REGIONAL_OPTIONS.includes(v),
        );
        notifications.push(
          E("p", {}, [
            E("strong", {}, _("Regional options cannot be used together")),
            E("br"),
            _(
              "Warning: %s cannot be used together with %s. Previous selections have been removed.",
            ).format(removedRegions.join(", "), lastSelected),
          ]),
        );
      }

      if (newValues.includes("russia_inside")) {
        const removedServices = newValues.filter(
          (v) => !main.ALLOWED_WITH_RUSSIA_INSIDE.includes(v),
        );
        if (removedServices.length > 0) {
          newValues = newValues.filter((v) =>
            main.ALLOWED_WITH_RUSSIA_INSIDE.includes(v),
          );
          notifications.push(
            E("p", { class: "alert-message warning" }, [
              E("strong", {}, _("Russia inside restrictions")),
              E("br"),
              _(
                "Warning: Russia inside can only be used with %s. %s already in Russia inside and have been removed from selection.",
              ).format(
                main.ALLOWED_WITH_RUSSIA_INSIDE.map(
                  (key) => main.DOMAIN_LIST_OPTIONS[key],
                )
                  .filter((label) => label !== "Russia inside")
                  .join(", "),
                removedServices.join(", "),
              ),
            ]),
          );
        }
      }

      if (JSON.stringify(newValues.sort()) !== JSON.stringify(values.sort())) {
        this.getUIElement(section_id).setValue(newValues);
      }

      notifications.forEach((notification) =>
        ui.addNotification(null, notification),
      );
      lastValues = newValues;
    } catch (e) {
      console.error("Error in onchange handler:", e);
    } finally {
      isProcessing = false;
    }
  };

  o = section.option(
    form.ListValue,
    "user_domain_list_type",
    _("User Domain List Type"),
    _("Select the list type for adding custom domains"),
  );
  o.value("disabled", _("Disabled"));
  o.value("dynamic", _("Dynamic List"));
  o.value("text", _("Text List"));
  o.default = "disabled";
  o.rmempty = false;

  o = section.option(
    form.DynamicList,
    "user_domains",
    _("User Domains"),
    _(
      "Enter domain names without protocols, e.g. example.com or sub.example.com",
    ),
  );
  o.placeholder = "Domains list";
  o.depends("user_domain_list_type", "dynamic");
  o.rmempty = false;
  o.validate = function (section_id, value) {
    // Optional
    if (!value || value.length === 0) {
      return true;
    }

    const validation = main.validateDomain(value, true);

    if (validation.valid) {
      return true;
    }

    return validation.message;
  };

  o = section.option(
    form.TextValue,
    "user_domains_text",
    _("User Domains List"),
    _(
      "Enter domain names separated by commas, spaces, or newlines. You can add comments using //",
    ),
  );
  o.placeholder =
    "example.com, sub.example.com\n// Social networks\ndomain.com test.com // personal domains";
  o.depends("user_domain_list_type", "text");
  o.rows = 8;
  o.rmempty = false;
  o.validate = function (section_id, value) {
    // Optional
    if (!value || value.length === 0) {
      return true;
    }

    const domains = main.parseValueList(value);

    if (!domains.length) {
      return _(
        "At least one valid domain must be specified. Comments-only content is not allowed.",
      );
    }

    const { valid, results } = main.bulkValidate(domains, (row) =>
      main.validateDomain(row, true),
    );

    if (!valid) {
      const errors = results
        .filter((validation) => !validation.valid) // Leave only failed validations
        .map((validation) => `${validation.value}: ${validation.message}`); // Collect validation errors

      return [_("Validation errors:"), ...errors].join("\n");
    }

    return true;
  };

  o = section.option(
    form.ListValue,
    "user_subnet_list_type",
    _("User Subnet List Type"),
    _("Select the list type for adding custom subnets"),
  );
  o.value("disabled", _("Disabled"));
  o.value("dynamic", _("Dynamic List"));
  o.value("text", _("Text List"));
  o.default = "disabled";
  o.rmempty = false;

  o = section.option(
    form.DynamicList,
    "user_subnets",
    _("User Subnets"),
    _(
      "Enter subnets in CIDR notation (e.g. 103.21.244.0/22) or single IP addresses",
    ),
  );
  o.placeholder = "IP or subnet";
  o.depends("user_subnet_list_type", "dynamic");
  o.rmempty = false;
  o.validate = function (section_id, value) {
    // Optional
    if (!value || value.length === 0) {
      return true;
    }

    const validation = main.validateSubnet(value);

    if (validation.valid) {
      return true;
    }

    return validation.message;
  };

  o = section.option(
    form.TextValue,
    "user_subnets_text",
    _("User Subnets List"),
    _(
      "Enter subnets in CIDR notation or single IP addresses, separated by commas, spaces, or newlines. " +
        "You can add comments using //",
    ),
  );
  o.placeholder =
    "103.21.244.0/22\n// Google DNS\n8.8.8.8\n1.1.1.1/32, 9.9.9.9 // Cloudflare and Quad9";
  o.depends("user_subnet_list_type", "text");
  o.rows = 10;
  o.rmempty = false;
  o.validate = function (section_id, value) {
    // Optional
    if (!value || value.length === 0) {
      return true;
    }

    const subnets = main.parseValueList(value);

    if (!subnets.length) {
      return _(
        "At least one valid subnet or IP must be specified. Comments-only content is not allowed.",
      );
    }

    const { valid, results } = main.bulkValidate(subnets, main.validateSubnet);

    if (!valid) {
      const errors = results
        .filter((validation) => !validation.valid) // Leave only failed validations
        .map((validation) => `${validation.value}: ${validation.message}`); // Collect validation errors

      return [_("Validation errors:"), ...errors].join("\n");
    }

    return true;
  };

  o = section.option(
    form.DynamicList,
    "local_domain_lists",
    _("Local Domain Lists"),
    _("Specify the path to the list file located on the router filesystem"),
  );
  o.placeholder = "/path/file.lst";
  o.rmempty = true;
  o.validate = function (section_id, value) {
    // Optional
    if (!value || value.length === 0) {
      return true;
    }

    const validation = main.validatePath(value);

    if (validation.valid) {
      return true;
    }

    return validation.message;
  };

  o = section.option(
    form.DynamicList,
    "local_subnet_lists",
    _("Local Subnet Lists"),
    _("Specify the path to the list file located on the router filesystem"),
  );
  o.placeholder = "/path/file.lst";
  o.rmempty = true;
  o.validate = function (section_id, value) {
    // Optional
    if (!value || value.length === 0) {
      return true;
    }

    const validation = main.validatePath(value);

    if (validation.valid) {
      return true;
    }

    return validation.message;
  };

  o = section.option(
    form.DynamicList,
    "remote_domain_lists",
    _("Remote Domain Lists"),
    _("Specify remote URLs to download and use domain lists"),
  );
  o.placeholder = "https://example.com/domains.srs";
  o.rmempty = true;
  o.validate = function (section_id, value) {
    // Optional
    if (!value || value.length === 0) {
      return true;
    }

    const validation = main.validateUrl(value);

    if (validation.valid) {
      return true;
    }

    return validation.message;
  };

  o = section.option(
    form.DynamicList,
    "remote_subnet_lists",
    _("Remote Subnet Lists"),
    _("Specify remote URLs to download and use subnet lists"),
  );
  o.placeholder = "https://example.com/subnets.srs";
  o.rmempty = true;
  o.validate = function (section_id, value) {
    // Optional
    if (!value || value.length === 0) {
      return true;
    }

    const validation = main.validateUrl(value);

    if (validation.valid) {
      return true;
    }

    return validation.message;
  };

  o = section.option(
    form.DynamicList,
    "fully_routed_ips",
    _("Fully Routed IPs"),
    _(
      "Specify local IP addresses or subnets whose traffic will always be routed through the configured route",
    ),
  );
  o.placeholder = "192.168.1.2 or 192.168.1.0/24";
  o.rmempty = true;
  o.validate = function (section_id, value) {
    // Optional
    if (!value || value.length === 0) {
      return true;
    }

    const validation = main.validateSubnet(value);

    if (validation.valid) {
      return true;
    }

    return validation.message;
  };

  o = section.option(
    form.Flag,
    "mixed_proxy_enabled",
    _("Enable Mixed Proxy"),
    _(
      "Enable the mixed proxy, allowing this section to route traffic through both HTTP and SOCKS proxies",
    ),
  );
  o.default = "0";
  o.rmempty = false;

  o = section.option(
    form.Value,
    "mixed_proxy_port",
    _("Mixed Proxy Port"),
    _(
      "Specify the port number on which the mixed proxy will run for this section. " +
        "Make sure the selected port is not used by another service",
    ),
  );
  o.rmempty = false;
  o.depends("mixed_proxy_enabled", "1");
}

const EntryPoint = {
  createSectionContent,
};

return baseclass.extend(EntryPoint);

