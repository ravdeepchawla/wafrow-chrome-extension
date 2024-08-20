
function updateElementDetails() {
    chrome.devtools.inspectedWindow.eval(
      `(function() {
        const el = $0; 
        if (!el) return 'No element selected';
        
        return el.innerText;
      })()`,
      function(result, isException) {
        const input = document.getElementById('input');
        input.innerText = result;

        makeGroqRequest(input.innerText);
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
            content: "You are a marketing copywriter refining marketing copy on a ecommerce website. Stick to the following 3 instructions explicitly and do not deviate from them. 1. Provide 3 distinct short, punchy marketing messages as alternatives to the user prompt. 2. Do not exceeding the character count of the user prompt. 3. Respond in the language of the user. Remember that being short and punchy is important and the original message's intent should not be lost.",
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
          model: "llama3-groq-70b-8192-tool-use-preview", // or any other model you want to use
          messages: messages,
          tools: tools,
          temperature: 1,
          tool_choice: "auto",
          max_tokens: 1024
        })
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const data = await response.json();
      console.log(data);
      const alternatives = data.choices[0].message.content;

      /* const alternatives = data.choices[0].message.content.map(function(item) {
        const li = document.createElement('li');
        li.textContent = JSON.parse(item.function.arguments).outputString;
        return li.outerHTML;
     }) */

      const output = document.getElementById('output');
      output.innerHTML = alternatives; // alternatives.join('');
      
      return data;
    } catch (error) {
      console.error('Error:', error);
      return null;
    }
  }