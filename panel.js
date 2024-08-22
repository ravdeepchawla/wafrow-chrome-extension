
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

    const apiKey = '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';
    const apiUrl = 'https://api.groq.com/openai/v1/chat/completions';

    const messages = [
        {
            role: "system",
            content: "You are a marketing copywriter. Provide one short marketing message as an alternative for the user prompt in the same tone of voice as the original. Do not exceed the character count of the user prompt in the response.",
        },
        {
            role: "user",
            content: prompt,
        }
    ];

    const tools = [{
        type: "function",
        function: {
          name: "get_structured_data",
          description: "Alternative marketing messages for the user prompt",
          parameters: {
            type: "object",
            properties: {
                outputString: {
                    type: "string",
                    description: "The alternative marketing messages",
                }
            },
            required: ["outputString"]
          }
        }
      }];
  
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "llama3-groq-70b-8192-tool-use-preview", // llama3-groq-70b-8192-tool-use-preview
          messages: messages,
          tools: tools,
          temperature: 0.5,
          tool_choice: "auto",
          max_tokens: 1024
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
      const response = await fetch("http://127.0.0.1:8001/api/setupExperiment", {
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