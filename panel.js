
function updateElementDetails() {
    chrome.devtools.inspectedWindow.eval(
      `(function() {
        const el = $0; 
        if (!el) return 'No element selected';
        
        return el.textContent;
      })()`,
      function(result, isException) {
        const input = document.getElementById('control');
        input.value = result;

        makeGroqRequest(input.value);
      }
    );
  }

// Listen for element selection changes
chrome.devtools.panels.elements.onSelectionChanged.addListener(updateElementDetails);

async function makeGroqRequest(prompt) {

    const apiUrl = 'https://wafrow.com/api/getAlternative';
  
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          "prompt": prompt
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

  const form = document.getElementById("createExperiment");

  form.addEventListener("submit", (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const data = [];

      for (const [key, value] of formData.entries()) {
        data[key] = value;
      }

      const requestBody = {};
      const rolloutpercentage = data['rollout'];
    
      const controlString = JSON.stringify({
        "textString" : data['control']
      })

      const treatmentString = JSON.stringify({
        "textString" : data['treatment']
      })

      const filters =  {
        "groups": [
            {
                "variant": null,
                "properties": [],
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