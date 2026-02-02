# Chrome Extension Integration Guide

Complete guide for integrating the Insert Jobs Worker with a Chrome extension.

**Worker Endpoint:** `https://nomadically-work-insert-jobs.eeeew.workers.dev`

## Quick Start

### 1. Extension Structure

```
my-job-saver-extension/
├── manifest.json
├── background.js
├── popup.html
├── popup.js
├── content.js
└── styles.css
```

### 2. manifest.json

```json
{
  "manifest_version": 3,
  "name": "Nomadically Job Saver",
  "version": "1.0.0",
  "description": "Save remote jobs to your Nomadically database",
  "permissions": [
    "activeTab",
    "storage"
  ],
  "host_permissions": [
    "https://nomadically-work-insert-jobs.eeeew.workers.dev/*"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "content_scripts": [
    {
      "matches": [
        "*://jobs.lever.co/*",
        "*://boards.greenhouse.io/*",
        "*://jobs.ashbyhq.com/*",
        "*://apply.workable.com/*",
        "*://*.linkedin.com/jobs/*",
        "*://*.indeed.com/viewjob*"
      ],
      "js": ["content.js"]
    }
  ]
}
```

### 3. background.js - API Helper

```javascript
const API_URL = 'https://nomadically-work-insert-jobs.eeeew.workers.dev';

// Store API secret if using authentication
async function getApiSecret() {
  const result = await chrome.storage.sync.get(['apiSecret']);
  return result.apiSecret || null;
}

async function insertJobs(jobs) {
  try {
    const headers = {
      'Content-Type': 'application/json',
    };

    // Add authentication if configured
    const apiSecret = await getApiSecret();
    if (apiSecret) {
      headers['Authorization'] = `Bearer ${apiSecret}`;
    }

    const response = await fetch(API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ jobs }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to insert jobs');
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error inserting jobs:', error);
    throw error;
  }
}

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'insertJobs') {
    insertJobs(request.jobs)
      .then(result => {
        console.log('✓ Jobs inserted:', result.data.successCount);
        sendResponse({ success: true, result });
      })
      .catch(error => {
        console.error('✗ Failed to insert jobs:', error);
        sendResponse({ success: false, error: error.message });
      });
    
    return true; // Keep message channel open for async response
  }
  
  if (request.action === 'setApiSecret') {
    chrome.storage.sync.set({ apiSecret: request.secret })
      .then(() => {
        sendResponse({ success: true });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    
    return true;
  }
});
```

### 4. popup.html - Extension Popup UI

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Nomadically Job Saver</title>
  <style>
    body {
      width: 350px;
      padding: 15px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      margin: 0;
    }
    
    h2 {
      margin: 0 0 15px 0;
      font-size: 18px;
      color: #333;
    }
    
    .form-group {
      margin-bottom: 12px;
    }
    
    label {
      display: block;
      margin-bottom: 5px;
      font-size: 13px;
      color: #666;
      font-weight: 500;
    }
    
    input, textarea {
      width: 100%;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 13px;
      box-sizing: border-box;
    }
    
    textarea {
      min-height: 60px;
      resize: vertical;
    }
    
    button {
      width: 100%;
      padding: 10px;
      margin: 5px 0;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: background-color 0.2s;
    }
    
    .btn-primary {
      background: #007bff;
      color: white;
    }
    
    .btn-primary:hover {
      background: #0056b3;
    }
    
    .btn-secondary {
      background: #6c757d;
      color: white;
    }
    
    .btn-secondary:hover {
      background: #545b62;
    }
    
    .status {
      padding: 10px;
      margin: 10px 0;
      border-radius: 4px;
      font-size: 13px;
      display: none;
    }
    
    .status.show {
      display: block;
    }
    
    .status.success {
      background: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }
    
    .status.error {
      background: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }
    
    .status.info {
      background: #d1ecf1;
      color: #0c5460;
      border: 1px solid #bee5eb;
    }
    
    .checkbox-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .checkbox-group input {
      width: auto;
    }
    
    .divider {
      margin: 15px 0;
      border-top: 1px solid #eee;
    }
  </style>
</head>
<body>
  <h2>💼 Save Job to Nomadically</h2>
  
  <div class="form-group">
    <label for="title">Job Title *</label>
    <input type="text" id="title" placeholder="e.g., Senior Frontend Developer">
  </div>
  
  <div class="form-group">
    <label for="company">Company *</label>
    <input type="text" id="company" placeholder="e.g., Acme Corp">
  </div>
  
  <div class="form-group">
    <label for="location">Location</label>
    <input type="text" id="location" placeholder="e.g., Remote - EU">
  </div>
  
  <div class="form-group">
    <label for="url">Job URL *</label>
    <input type="text" id="url" placeholder="https://...">
  </div>
  
  <div class="form-group">
    <label for="salary">Salary</label>
    <input type="text" id="salary" placeholder="e.g., €80,000 - €100,000">
  </div>
  
  <div class="form-group">
    <label for="techStack">Tech Stack (comma separated)</label>
    <input type="text" id="techStack" placeholder="React, TypeScript, Node.js">
  </div>
  
  <div class="form-group checkbox-group">
    <input type="checkbox" id="remoteFriendly" checked>
    <label for="remoteFriendly" style="margin: 0;">Remote Friendly</label>
  </div>
  
  <button id="saveJob" class="btn-primary">💾 Save Job</button>
  <button id="autoFill" class="btn-secondary">🔍 Auto-Fill from Page</button>
  
  <div id="status" class="status"></div>
  
  <div class="divider"></div>
  
  <details>
    <summary style="cursor: pointer; font-size: 13px; color: #666;">⚙️ Settings</summary>
    <div style="margin-top: 10px;">
      <div class="form-group">
        <label for="apiSecret">API Secret (optional)</label>
        <input type="password" id="apiSecret" placeholder="Leave empty if not using auth">
      </div>
      <button id="saveSettings" class="btn-secondary">Save Settings</button>
    </div>
  </details>
  
  <script src="popup.js"></script>
</body>
</html>
```

### 5. popup.js - Popup Logic

```javascript
// Auto-fill current tab URL on load
document.addEventListener('DOMContentLoaded', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  document.getElementById('url').value = tab.url;
  
  // Load saved API secret
  const result = await chrome.storage.sync.get(['apiSecret']);
  if (result.apiSecret) {
    document.getElementById('apiSecret').value = result.apiSecret;
  }
});

// Auto-fill from page content
document.getElementById('autoFill').addEventListener('click', async () => {
  showStatus('Extracting job data from page...', 'info');
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Send message to content script to extract job data
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractJob' });
    
    if (response && response.job) {
      const job = response.job;
      if (job.title) document.getElementById('title').value = job.title;
      if (job.company) document.getElementById('company').value = job.company;
      if (job.location) document.getElementById('location').value = job.location;
      if (job.salary) document.getElementById('salary').value = job.salary;
      if (job.url) document.getElementById('url').value = job.url;
      if (job.techStack && job.techStack.length > 0) {
        document.getElementById('techStack').value = job.techStack.join(', ');
      }
      if (typeof job.remoteFriendly === 'boolean') {
        document.getElementById('remoteFriendly').checked = job.remoteFriendly;
      }
      
      showStatus('✓ Auto-filled from page!', 'success');
    } else {
      showStatus('Could not extract job data from this page', 'error');
    }
  } catch (error) {
    console.error('Auto-fill error:', error);
    showStatus('This page doesn\'t support auto-fill', 'error');
  }
});

// Save job
document.getElementById('saveJob').addEventListener('click', async () => {
  const title = document.getElementById('title').value.trim();
  const company = document.getElementById('company').value.trim();
  const url = document.getElementById('url').value.trim();
  
  // Validation
  if (!title || !company || !url) {
    showStatus('Please fill in all required fields (Title, Company, URL)', 'error');
    return;
  }
  
  showStatus('Saving job...', 'info');
  
  const techStackInput = document.getElementById('techStack').value.trim();
  const techStack = techStackInput ? techStackInput.split(',').map(t => t.trim()).filter(t => t) : [];
  
  const job = {
    title,
    company,
    location: document.getElementById('location').value.trim() || undefined,
    url,
    salary: document.getElementById('salary').value.trim() || undefined,
    techStack: techStack.length > 0 ? techStack : undefined,
    remoteFriendly: document.getElementById('remoteFriendly').checked,
    status: 'new',
    sourceType: 'manual',
  };
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'insertJobs',
      jobs: [job]
    });
    
    if (response.success) {
      showStatus(`✓ Job saved successfully! (${response.result.data.successCount} inserted)`, 'success');
      
      // Clear form after 1.5 seconds
      setTimeout(() => {
        document.getElementById('title').value = '';
        document.getElementById('company').value = '';
        document.getElementById('location').value = '';
        document.getElementById('salary').value = '';
        document.getElementById('techStack').value = '';
      }, 1500);
    } else {
      throw new Error(response.error);
    }
  } catch (error) {
    console.error('Save error:', error);
    showStatus(`✗ Error: ${error.message}`, 'error');
  }
});

// Save settings
document.getElementById('saveSettings').addEventListener('click', async () => {
  const apiSecret = document.getElementById('apiSecret').value.trim();
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'setApiSecret',
      secret: apiSecret
    });
    
    if (response.success) {
      showStatus('✓ Settings saved!', 'success');
    } else {
      throw new Error(response.error);
    }
  } catch (error) {
    showStatus(`✗ Error: ${error.message}`, 'error');
  }
});

function showStatus(message, type) {
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = message;
  statusDiv.className = `status ${type} show`;
  
  if (type === 'success') {
    setTimeout(() => {
      statusDiv.classList.remove('show');
    }, 3000);
  }
}
```

### 6. content.js - Extract Job Data from Pages

```javascript
// Extract job data based on the site
function extractJobData() {
  const url = window.location.href;
  const hostname = window.location.hostname;
  
  // Greenhouse
  if (hostname.includes('greenhouse.io')) {
    return extractFromGreenhouse();
  }
  
  // Lever
  if (hostname.includes('lever.co')) {
    return extractFromLever();
  }
  
  // Ashby
  if (hostname.includes('ashbyhq.com')) {
    return extractFromAshby();
  }
  
  // LinkedIn
  if (hostname.includes('linkedin.com')) {
    return extractFromLinkedIn();
  }
  
  // Generic fallback
  return extractGeneric();
}

function extractFromGreenhouse() {
  return {
    title: document.querySelector('h1.app-title')?.textContent?.trim(),
    company: document.querySelector('.company-name')?.textContent?.trim(),
    location: document.querySelector('.location')?.textContent?.trim(),
    description: document.querySelector('#content')?.textContent?.trim(),
    url: window.location.href,
    remoteFriendly: document.body.textContent.toLowerCase().includes('remote'),
    sourceType: 'greenhouse',
  };
}

function extractFromLever() {
  return {
    title: document.querySelector('.posting-headline h2')?.textContent?.trim(),
    company: document.querySelector('.main-header-text a')?.textContent?.trim(),
    location: document.querySelector('.posting-categories .location')?.textContent?.trim(),
    description: document.querySelector('.content')?.textContent?.trim(),
    url: window.location.href,
    remoteFriendly: document.body.textContent.toLowerCase().includes('remote'),
    sourceType: 'lever',
  };
}

function extractFromAshby() {
  return {
    title: document.querySelector('h1._title_wvjh8_1')?.textContent?.trim() ||
           document.querySelector('h1')?.textContent?.trim(),
    company: document.querySelector('._jobBoardName_wvjh8_157')?.textContent?.trim(),
    location: document.querySelector('._infoItem_wvjh8_245:nth-child(1)')?.textContent?.trim(),
    description: document.querySelector('._description_wvjh8_318')?.textContent?.trim(),
    url: window.location.href,
    remoteFriendly: document.body.textContent.toLowerCase().includes('remote'),
    sourceType: 'ashby',
  };
}

function extractFromLinkedIn() {
  return {
    title: document.querySelector('.job-details-jobs-unified-top-card__job-title')?.textContent?.trim() ||
           document.querySelector('h1')?.textContent?.trim(),
    company: document.querySelector('.job-details-jobs-unified-top-card__company-name')?.textContent?.trim(),
    location: document.querySelector('.job-details-jobs-unified-top-card__bullet')?.textContent?.trim(),
    description: document.querySelector('.jobs-description-content__text')?.textContent?.trim(),
    url: window.location.href,
    remoteFriendly: document.body.textContent.toLowerCase().includes('remote'),
    sourceType: 'linkedin',
  };
}

function extractGeneric() {
  // Try to find common patterns
  const title = document.querySelector('h1')?.textContent?.trim() ||
                document.querySelector('[class*="title"]')?.textContent?.trim();
  
  return {
    title,
    company: extractCompanyFromDomain(),
    location: findTextByPattern(/location|based|office/i),
    description: document.querySelector('[class*="description"]')?.textContent?.trim(),
    url: window.location.href,
    remoteFriendly: document.body.textContent.toLowerCase().includes('remote'),
    sourceType: 'manual',
  };
}

function extractCompanyFromDomain() {
  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  return parts[parts.length - 2] || hostname;
}

function findTextByPattern(pattern) {
  const elements = document.querySelectorAll('*');
  for (const el of elements) {
    if (pattern.test(el.className) || pattern.test(el.textContent)) {
      return el.textContent?.trim();
    }
  }
  return null;
}

// Listen for extraction requests from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractJob') {
    const job = extractJobData();
    sendResponse({ job });
  }
  return true;
});

// Add floating save button to job pages
function addSaveButton() {
  const existingButton = document.getElementById('nomadically-save-btn');
  if (existingButton) return;
  
  const button = document.createElement('button');
  button.id = 'nomadically-save-btn';
  button.innerHTML = '💼 Save to Nomadically';
  button.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 999999;
    padding: 12px 20px;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    transition: all 0.2s;
  `;
  
  button.onmouseover = () => {
    button.style.transform = 'translateY(-2px)';
    button.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)';
  };
  
  button.onmouseout = () => {
    button.style.transform = 'translateY(0)';
    button.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
  };
  
  button.onclick = async () => {
    button.textContent = '⏳ Saving...';
    button.disabled = true;
    
    const job = extractJobData();
    
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'insertJobs',
        jobs: [job]
      });
      
      if (response.success) {
        button.textContent = '✓ Saved!';
        button.style.background = '#28a745';
        setTimeout(() => {
          button.textContent = '💼 Save to Nomadically';
          button.style.background = '#007bff';
          button.disabled = false;
        }, 2000);
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      button.textContent = '✗ Failed';
      button.style.background = '#dc3545';
      setTimeout(() => {
        button.textContent = '💼 Save to Nomadically';
        button.style.background = '#007bff';
        button.disabled = false;
      }, 2000);
    }
  };
  
  document.body.appendChild(button);
}

// Add button when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', addSaveButton);
} else {
  addSaveButton();
}
```

## Installation

1. **Create extension directory** with all the files above
2. **Add icons** (optional) to `icons/` folder
3. **Load in Chrome:**
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select your extension directory

## Usage

### Method 1: Use Popup

1. Navigate to a job posting
2. Click the extension icon
3. Fill in job details (or click "Auto-Fill from Page")
4. Click "Save Job"

### Method 2: Use Floating Button

1. Navigate to a job posting on supported sites
2. Click the floating "Save to Nomadically" button

### Method 3: Programmatic

```javascript
// From any extension script
chrome.runtime.sendMessage({
  action: 'insertJobs',
  jobs: [{
    title: 'Senior Developer',
    company: 'Acme Corp',
    url: 'https://example.com/job',
    remoteFriendly: true
  }]
}, response => {
  if (response.success) {
    console.log('Saved!', response.result);
  }
});
```

## Advanced Features

### Add Keyboard Shortcut

In `manifest.json`, add:

```json
"commands": {
  "save-job": {
    "suggested_key": {
      "default": "Ctrl+Shift+S",
      "mac": "Command+Shift+S"
    },
    "description": "Save current job"
  }
}
```

In `background.js`, add:

```javascript
chrome.commands.onCommand.addListener((command) => {
  if (command === 'save-job') {
    // Trigger save action
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'quickSave' });
    });
  }
});
```

### Batch Import from CSV

Add to `popup.html`:

```html
<input type="file" id="csvFile" accept=".csv">
<button id="importCsv">Import Jobs from CSV</button>
```

Add to `popup.js`:

```javascript
document.getElementById('importCsv').addEventListener('click', async () => {
  const file = document.getElementById('csvFile').files[0];
  if (!file) return;
  
  const text = await file.text();
  const jobs = parseCSV(text);
  
  const response = await chrome.runtime.sendMessage({
    action: 'insertJobs',
    jobs
  });
  
  showStatus(`Imported ${response.result.data.successCount} jobs!`, 'success');
});

function parseCSV(text) {
  const lines = text.split('\n');
  const headers = lines[0].split(',');
  
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const job = {};
    headers.forEach((header, i) => {
      job[header.trim()] = values[i]?.trim();
    });
    return job;
  });
}
```

## Troubleshooting

### CORS Issues

The worker has CORS enabled by default. If you still see CORS errors:

1. Check `host_permissions` in manifest.json
2. Verify the worker URL is correct

### Content Script Not Working

1. Reload the extension after making changes
2. Refresh the job posting page
3. Check console for errors: Right-click → Inspect → Console

### Jobs Not Saving

1. Check the worker is deployed and accessible
2. Verify TURSO_DB_AUTH_TOKEN is set
3. Check browser console and background service worker logs

### View Background Service Worker Logs

1. Go to `chrome://extensions/`
2. Find your extension
3. Click "service worker" under "Inspect views"

## Security Best Practices

✅ **Store API secrets in chrome.storage.sync** (encrypted)  
✅ **Use host_permissions** to limit which sites can access the API  
✅ **Validate all user input** before sending to worker  
✅ **Never hardcode secrets** in extension code  

## Next Steps

- Add more job board extractors (Indeed, Remote.co, etc.)
- Implement job deduplication before saving
- Add tagging and categorization in popup
- Sync saved jobs count with badge icon
- Export jobs to different formats
