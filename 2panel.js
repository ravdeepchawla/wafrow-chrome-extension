document.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('click', (event) => {
    const clickedElement = event.target;
    const selector = buildSelector(clickedElement);

    console.log(clickedElement);
    console.log(selector);
    let selectedElement = document.getElementById("selected_element");
    selectedElement.value = selector;
  });

  function buildSelector(element) {
    // Start with the element's tag name
    let selector = element.tagName.toLowerCase();
    const selectorParts = [];

    // Check for ID
    if (element.id) {
      return `${selector}#${element.id}`;
    }

    // Check for classes
    if (element.className) {
      const classes = element.className.trim().split(/\s+/);
      selector += `.${classes.join('.')}`;
    }

    // Add attributes
    const attributes = element.attributes;
    for (let i = 0; i < attributes.length; i++) {
      const attr = attributes[i];
      if (attr.name !== 'class') {
        selector += `[${attr.name}='${attr.value}']`;
      }
    }

    selectorParts.unshift(selector);

    // Traverse up the DOM tree
    let parent = element.parentElement;
    while (parent && parent !== document.body) {
      let parentSelector = parent.tagName.toLowerCase();
      
      if (parent.id) {
        selectorParts.unshift(`${parentSelector}#${parent.id} > `);
        break;
      } else {
        const nthChild = Array.from(parent.parentElement.children).indexOf(parent) + 1;
        selectorParts.unshift(`${parentSelector}:nth-child(${nthChild}) > `);
      }

      parent = parent.parentElement;
    }

    return selectorParts.join('').trim();
  }
});