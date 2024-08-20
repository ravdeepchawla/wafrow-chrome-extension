chrome.devtools.panels.elements.createSidebarPane(
    "Wafrow", function(sidebar) {
      sidebar.setPage("panel.html");
  }
);

document.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('click', (event) => {
    const clickedElement = event.target;
   // const selector = buildSelector(clickedElement);

    console.log(clickedElement);
  //  console.log(selector);
  //  let selectedElement = document.getElementById("selected_element");
  //  selectedElement.value = selector;
  });
})

