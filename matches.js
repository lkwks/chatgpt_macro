function fill_textarea()
{
  document.querySelector("#__next > div > div > main").querySelector("form").querySelector("textarea").innerText = `From now on, always answer my question using this format:
RQ: {{ Rephrased version of my question in a more natural way }}
A: {{ Your answer to my question }} If you are able to do it, just say yes in this turn.`;
  document.querySelector("#__next > div > div > main").querySelector("form").querySelector("button").click();
}


async function play_tts(text)
{
    const voice_name = 'en-US-Wavenet-G';
    const audioConfig = { audioEncoding: 'LINEAR16'};
    
    const params = {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ input: { text: text }, voice: {languageCode: 'en-US', name: voice_name}, audioConfig: audioConfig}),
      };

    const response = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize?key=', params);

    const blob = new Blob([Uint8Array.from(atob((await response.json()).audioContent), c => c.charCodeAt(0))], { type: 'audio/mp3' });
    new Audio(URL.createObjectURL(blob)).play();

    console.log('now generating');
}




const onMutation = (mutations) => {
  mo.disconnect(); // Required if you modify the DOM during this process.

  var exist_h1 = false;
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      var parser = new DOMParser();
      var doc = parser.parseFromString(node.innerHTML, 'text/html').body.querySelector("h1");
      if (doc && doc.innerText === "New Chat")
      {
        console.log('There is a change in the `h1` tag.');
        exist_h1 = true;
        break;
      }
    }
    if (exist_h1) break;
  }

  if (document.querySelector("#__next > div > div > main > div.flex-1.overflow-hidden > div > div").classList.contains('play_tts') == false)
  {
    console.log(document.querySelector("#__next > div > div > main > div.flex-1.overflow-hidden > div > div"));
    document.querySelector("#__next > div > div > main > div.flex-1.overflow-hidden > div > div").addEventListener("click", async (e)=>{await play_tts(e.target.innerText)});
    document.querySelector("#__next > div > div > main > div.flex-1.overflow-hidden > div > div").classList.add('play_tts');
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
  document.querySelector("#__next > div > div > main > div.flex-1.overflow-hidden > div > div").classList.add('play_tts');
  document.querySelector("#__next > div > div > main > div.flex-1.overflow-hidden > div > div").addEventListener("click", async (e)=>{await play_tts(e.target.innerText)})

  
