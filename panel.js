
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
        if (result !== null) {
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

    const apiUrl = 'https://wafrow.com/api/getAlternative';
  
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          "prompt": prompt,
          "lang": language
        })
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const data = await response.json();
      // console.log(data);
      const alternatives = data.choices[0].message.content;

      const output = document.getElementById('treatment');
      output.value = alternatives; // alternatives.join('');
      
      return data;
    } catch (error) {
      console.error('Error:', error);
      return null;
    }
  }

document.addEventListener("DOMContentLoaded", (event) => {  

  const rollout = document.getElementById('rollout');
  rollout.addEventListener('input', () => {
    rolloutpercentage.textContent = rollout.value;
  });

  getLanguage()
    .then(language => { 
      const langSelector = document.getElementById('language');
      langSelector.value = language;
    })

  const form = document.getElementById("createExperiment");

  form.addEventListener("submit", (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const data = [];

      for (const [key, value] of formData.entries()) {
        data[key] = value;
      }

      const requestBody = {};
      const rolloutpercentage = parseInt(data['rollout']);
    
      const controlString = JSON.stringify({
        "textString" : data['control'],
        "elementSelector": data['selectedElement']
      })

      const treatmentString = JSON.stringify({
        "textString" : data['treatment'],
        "elementSelector": data['selectedElement']
      })

      const filters =  {
        "groups": [
            {
                "variant": null,
                "properties": [
                    {
                        "key": "orgID",
                        "type": "person",
                        "value": [
                          data['organizationID']
                        ],
                        "operator": "exact"
                    }
                ],
                "rollout_percentage": rolloutpercentage
            }
        ],
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

    requestBody['name'] = data['organizationID'];
    requestBody['key'] = data['experimentName'];
    requestBody['filters'] = JSON.stringify(filters);
      
    // console.log(requestBody);

    callAPI(requestBody)

  });
});

async function callAPI(requestBody) {

  const button = document.getElementById('setupExperiment');
  const responseMessage = document.getElementById('response');

  button.setAttribute('aria-busy', 'true');
  
  try {
    //TODO: switch to public API
      const response = await fetch("https://wafrow.com/api/setupExperiment", {
          method: "POST",
          headers: {
              "Content-Type": "application/json"
          },
          body: JSON.stringify(requestBody)
      });
      const data = await response.json();
      
      responseMessage.textContent = data.message;
      console.log(data);
  } catch (error) {
      console.error("Error:", error);
      response.style.display = "none";
  } finally {
    button.setAttribute('aria-busy', 'false');
  }
}

function getLanguage() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else if (tabs.length === 0) {
        reject(new Error("No active tab found"));
      } else {
        chrome.tabs.detectLanguage(tabs[0].id, function(language) {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(language);
          }
        });
      }
    });
  });
}
