class Player {
  constructor()
  {

    this.obj = document.createElement("button");
    this.obj.innerText = '▶';
    this.obj.style.position = 'fixed';
    this.obj.style.display = 'none';
    this.obj.style.background = 'white';
    this.obj.style.border = '1px solid black';
    this.obj.style.width = '18px';
    this.obj.style.height = '22px';
    this.obj.style.fontFamily = 'math';
    this.obj.style.zIndex = 2147483647;
    this.obj.addEventListener("click", async ()=>{
      if (this.obj.innerText === '⏸')
        this.pause();
      else
        await this.play();
    });

    document.body.appendChild(this.obj);


    this.audio = new Audio();
    this.audio.src = 'https://chat.openai.com/chat';
    this.audio.addEventListener("ended", ()=>{this.close();});

    this.text = '';
    this.dict = {};

    this.close();
  }

  async play()
  {
    this.obj.innerText = '⏸';
    if (this.audio.src === 'https://chat.openai.com/chat')
      await this.get_tts();
    this.audio.play();
  }

  close()
  {
    this.pause();
    this.audio.src = 'https://chat.openai.com/chat';
    this.obj.style.display = 'none';
  }

  pause()
  {
    this.obj.innerText = '▶';
    this.audio.pause();
  }

  open(x, y)
  {
    this.obj.style.display = 'block';
    this.obj.style.top = y;
    this.obj.style.left = x;
  }

  set_this_text(text)
  {
    this.close();
    this.text = text;    
  }

  async get_tts()
  {
      if (this.text === '') return;
      if (this.dict[this.text])
      {
        this.audio.src = this.dict[this.text];
        return;
      }

      const rand_num = Math.floor(Math.random()*10);
      const name_char = 'CEFGHACFAC';
      const lang_code = (rand_num < 5) ? 'US' : ( (rand_num < 8) ? 'GB' : 'AU' );      

      const params = {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ input: { text: this.text }, voice: {languageCode: 'en-'+ lang_code, name: `en-${lang_code}-Wavenet-${name_char[rand_num]}`}, audioConfig: { audioEncoding: 'LINEAR16'}}),
        };
  
      const response = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize?key=', params);
  
      const blob = new Blob([Uint8Array.from(atob((await response.json()).audioContent), c => c.charCodeAt(0))], { type: 'audio/mp3' });
      this.audio.src = URL.createObjectURL(blob);
      this.dict[this.text] = this.audio.src;
  }  
}




function fill_textarea()
{

  if (document.querySelector("#__next > div > div > main") && document.querySelector("#__next > div > div > main").querySelector("h1") && document.querySelector("#__next > div > div > main").querySelector("h1").innerText === "ChatGPT")
{
  document.querySelector("#__next > div > div > main").querySelector("form").querySelector("textarea").value = `From now on, always answer my questions using this format:
RQ: {{ My sentences, each of them rephrased in a more natural way }}
A: {{ Your answer to my question }}
My question is: `;
document.querySelector("#__next > div > div > main").querySelector("form").querySelector("textarea").style.height = "96px";

}
}




/*

1. 처음 페이지를 열었을 때 textarea 채우기


2. 다른 채팅에 있다가 new chat을 눌렀을 때 textarea 채우기
- new chat을 누르기 전에 DOM에 없던 `h1` 태그가 new chat을 누르자마자 등장.

*/


const onMutation = (mutations) => {
  mo.disconnect(); // Required if you modify the DOM during this process.

  var there_is_text = false;
  for (mutation of mutations)
    for (node of mutation.addedNodes)
      if (node.nodeName === "#text") there_is_text = true;
  
  if (there_is_text === false)
    setTimeout(fill_textarea, 500);

  observe();
}

const observe = () => {
  mo.observe(document, {
    subtree: true,
    childList: true,
  });
}

const mo = new MutationObserver(onMutation);
observe();


setTimeout(fill_textarea, 500);

var tts_player = new Player();

/*
ChatGPT는 프롬프트를 넣으면 그에 대응되는 답변이 API를 통해 천천히 출력되는 구조.
특정 문단의 CSS 선택자 정보 없이 '특정 문단만 선택적으로 TTS API에 전송' 기능을 구현하려면?
*/

document.body.addEventListener("mouseup", async (e)=>{
  if (tts_player.audio.paused)
  {
    var selection = window.getSelection();
      if ( selection.type === "Caret")
      {
        if(e.target.innerText.indexOf("\n") === -1 && e.target.innerText !== '' && e.target.innerText !== '⏸' && e.target.innerText !== '▶')
        {
          tts_player.set_this_text(e.target.innerText);
          var rect = e.target.getBoundingClientRect();
          tts_player.open(rect.left - 24 + "px", rect.top + 2 + "px");
          await tts_player.play();
        }
        else
          tts_player.close();
      }
      else if(selection.type === "Range")
      {
        tts_player.set_this_text(selection.toString());
        var rect = selection.getRangeAt(0).getBoundingClientRect();
        tts_player.open(rect.left - 24 + "px", rect.top + 20 + "px");
      }
  }
});


/*

1. 셀렉션 부분이 재생중일 때 문단을 클릭하면 일어날 일은?
-> 아무 일도 일어나지 않는다.

2. 문단을 재생중일 때 셀렉션을 설정하면 일어날 일은?
-> 아무 일도 일어나지 않는다.

*/
