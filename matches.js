function fill_textarea()
{
  document.querySelector("#__next > div > div > main").querySelector("form").querySelector("textarea").innerText = `From now on, always answer my question using this format:
RQ: {{ Rephrased version of my question in a more natural way }}
A: {{ Your answer to my question }} If you are able to do it, just say yes in this turn.`;
  document.querySelector("#__next > div > div > main").querySelector("form").querySelector("button").click();
}


const onMutation = (mutations) => {
  mo.disconnect(); // Required if you modify the DOM during this process.

  var exist_h1 = false;
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      var parser = new DOMParser();
      var doc = parser.parseFromString(node.innerHTML, 'text/html').body.querySelector("h1");
      if (doc)
      {
        exist_h1 = true;
        break;
      }
    }
    if (exist_h1) break;
  }

  if (exist_h1) fill_textarea();
  observe(); // Required if you modify the DOM during this process.
}

const observe = () => {
  mo.observe(document, {
    subtree: true,
    childList: true,
  });
}

const mo = new MutationObserver(onMutation);

observe();

if (document.querySelector("#__next > div > div > main") && document.querySelector("#__next > div > div > main").querySelector("h1"))
  fill_textarea();