const appDomain = "https://wafrow.com"; // "http://127.0.0.1:8000";

function updateElementDetails() {

  chrome.devtools.inspectedWindow.eval(
    `(function() {
      const el = $0; 
      if (!el || el === document.body) return;
      
      const getXPath = function(element) {
      if (element && element.nodeType === Node.ELEMENT_NODE) {
        // If the element has an id, use it
        if (element.id) {
          return '//*[@id="' + element.id + '"]';
        }
        
        // Get all siblings of the same type
        const siblings = Array.from(element.parentNode.childNodes)
          .filter(node => node.nodeType === Node.ELEMENT_NODE && node.tagName === element.tagName);
        
        // If the element has siblings of the same type, we need to differentiate
        if (siblings.length > 1) {
          const index = siblings.indexOf(element) + 1;
          return getXPath(element.parentNode) + '/' + element.tagName.toLowerCase() + '[' + index + ']';
        } else {
          return getXPath(element.parentNode) + '/' + element.tagName.toLowerCase();
        }
      }
      // Handle cases where we've reached the root or an invalid node
      else {
        return '';
        }
      };

      const getFullXPath = function(element) {
        let xpath = getXPath(element);
        
        // Ensure the XPath starts with '/'
        if (xpath && xpath.charAt(0) !== '/') {
          xpath = '/' + xpath;
        }
        
        // If XPath is empty (e.g., for the document itself), return '/html'
        return xpath || '/html';
      };

      return [el.textContent, getFullXPath(el)]
    })()`,
    function(result, isException) {
      if (!isException) {
        if (Array.isArray(result) && result.length > 0) {
          const input = document.getElementById('control');
          input.value = result[0];
          
          const elSelector = document.getElementById('selectedElement');
          elSelector.value = result[1];

          langSelector = document.getElementById('language');

          makeGroqRequest(input.value, langSelector.value);
        }
      }
    }
  );
}

// Listen for element selection changes
chrome.devtools.panels.elements.onSelectionChanged.addListener(updateElementDetails);

async function makeGroqRequest(prompt, language) {

    const apiUrl = appDomain + '/api/getAlternative';
    const domain = document.getElementById('domain');
    const startURL = document.getElementById('startURL');
    const loadingTreatment = document.getElementById('loadingTreatment');
    const treatment = document.getElementById('treatment');

    const token = document.getElementById('organizationID').value;

    loadingTreatment.setAttribute('aria-busy', 'true');
    treatment.value = '...';

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept':'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          "prompt": prompt,
          "lang": language,
          "pageURL": domain.value+startURL.value,
          "personalizationVariable": document.getElementById('personalization').value,
        })
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const data = await response.json();
      const alternatives = data.data;

      const treatment = document.getElementById('treatment');
      treatment.value = alternatives; // alternatives.join('');
      loadingTreatment.setAttribute('aria-busy', 'false');
      
      return data;
    } catch (error) {
      // console.error('Error:', error);
      return null;
    }
  }

document.addEventListener("DOMContentLoaded", async (event) => {
  const isLoggedIn = await checkLoginStatus();

  if(isLoggedIn) {
    setupExperimentForm();
  };
});

async function setupExperimentForm() {
  const rollout = document.getElementById('rollout');
  rollout.addEventListener('input', () => {
    rolloutpercentage.textContent = rollout.value;
  });

  try {
      const result = await getLanguageURL();
      //console.log(result);
      const langSelector = document.getElementById('language');
      langSelector.value = result.language;

      const startURL = document.getElementById('startURL');
      const url = new URL(result.url)
      startURL.value = url.pathname;

      const domain = document.getElementById('domain');
      domain.value = url.protocol + '//' + url.hostname;

  } catch (error) {
      console.error("Error getting language and URL:", error);
    }

    const form = document.getElementById("createExperiment");

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      createExperiment(formData);
    })

    const selectedLanguage = document.getElementById('language');
    const prompt = document.getElementById('control');

    selectedLanguage.addEventListener('change', function(event) {
      if (event.isTrusted) {       
        makeGroqRequest(prompt.value, selectedLanguage.value);
      }
    });
  }

function checkLoginStatus() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['apiToken'], function(result) {
      if (result.apiToken !== undefined) {
      const apiToken = document.getElementById('organizationID');
      apiToken.value = result.apiToken;

      const notLoggedIn = document.getElementById('notLoggedIn');
      notLoggedIn.style.display = "none";

      const loggedIn = document.getElementById('loggedIn');
      loggedIn.style.display = "block";
      resolve(true);
      } else {
        resolve(false);
      }
    });
  });
}

function createExperiment(formData) {
  const data = [];

  for (const [key, value] of formData.entries()) {
    data[key] = value;
  }

  const requestBody = {};
    
    const controlString = JSON.stringify({
      "elements": [
        {
          "content" : data['control'],
          "elementSelector": data['selectedElement'],
        }
      ],
      "pathName": data['startURL']
    })

    const treatmentString = JSON.stringify({
      "elements": [
        {
          "content" : data['treatment'],
          "elementSelector": data['selectedElement'],
        }
      ],
      "pathName": data['startURL']
    })

    const filters =  {
      "payloads": {
          "control": controlString,
          "treatment": treatmentString,
      },
      "multivariate": {
          "variants": [
              {
                  "key": "control",
                  "name": "control",
                  "rollout_percentage": 50
              },
              {
                  "key": "treatment",
                  "name": "treatment",
                  "rollout_percentage": 50
              }
          ]
      }
    }

    requestBody['key'] = data['experimentName'];
    requestBody['filters'] = JSON.stringify(filters);
    requestBody['rollout'] = parseInt(data['rollout']);
    requestBody['language'] = data['language'];
    requestBody['domain'] = data['domain'];
    requestBody['startURL'] = data['startURL'];
    requestBody['goalURL'] = data['goalURL'];

    // console.log(requestBody);

    callAPI(requestBody);
}

async function callAPI(requestBody) {

  const button = document.getElementById('setupExperiment');
  const responseMessage = document.getElementById('response');
  const errorMessage = document.getElementById('error');
  const token = document.getElementById('organizationID').value;

  try {
      button.setAttribute('aria-busy', 'true');
      responseMessage.textContent = "";
      errorMessage.textContent = "";

      const response = await fetch(appDomain + "/api/setupExperiment", {
          method: "POST",
          headers: {
              "Content-Type": "application/json",
              "Accept":"application/json",
              "Authorization": `Bearer ${token}`, 
          },
          body: JSON.stringify(requestBody)
      });
      const data = await response.json();
      
      if (data.message) {
        responseMessage.textContent = data.message;
      }
      
      if (data.error && data.error.detail) {
        errorMessage.textContent = data.error.detail;
      }
      //console.log(data);
  } catch (error) {
     // console.error(error);
      responseMessage.textContent = error;
  } finally {
    button.setAttribute('aria-busy', 'false');
  }
}

async function getLanguageURL() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({active: true, currentWindow: true}, async (tabs) => {
      
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      if (tabs.length === 0) {
        reject(new Error("No active tab found"));
        return;
      }

      const tab = tabs[0];
    
      try {
        const language = await chrome.tabs.detectLanguage(tab.id);
        resolve({language, url: tab.url});
      } catch (error) {
        reject(new Error(`Failed to detect language: ${error.message}`));
      }
    });
  });
}

document.getElementById('apiForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const token = document.getElementById('apiToken');
  const helper = document.getElementById('apiTokenHelper')

  token.setAttribute('aria-busy', 'true');
    fetch(appDomain + "/api/me", {
          method: "GET",
          headers: {
              "Content-Type": "application/json",
              "Accept":"application/json",
              "Authorization": `Bearer ${token.value}`, 
          }
      })
      .then(response => {
        if (!response.ok) {
          token.setAttribute('aria-busy', 'false');
          token.setAttribute('aria-invalid', 'true');
          throw new Error('API request failed');
        }
        return response.json();
      })
      .then(data => {
        chrome.storage.sync.set({apiToken: token.value}, function() {
          if(checkLoginStatus()) {
          setupExperimentForm();
          };
        });
        token.setAttribute('aria-busy', 'false');
      })
      .catch(error => {
        token.setAttribute('aria-busy', 'false');
        token.setAttribute('aria-invalid', 'true');
        helper.innerHTML="Please check if the API token is from <a href='"+appDomain+"/dashboard/settings' target='_blank'>settings</a>";
        console.error('API call failed:', error);        
      });
});