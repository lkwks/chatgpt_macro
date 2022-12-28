class GenerationManager {
  constructor(target)
  {
   this.target = target;
   this.log = []; 
   this.last_sentence = ["", 0];
  }
}

class DOMObserver {
  constructor(tts_player)
  {
    setInterval(async ()=>{await this.new_answer_observer();}, 1000);
    this.last_main_length = document.querySelector("main").innerText.length;
    this.tts_player = tts_player;
  }

  get_last_node()
  {
    var iter = document.createNodeIterator(document.querySelector("main div"), NodeFilter.SHOW_TEXT);
    var node = iter.nextNode(), tnode = null;
    while (node)
    {
      tnode = node;
      node = iter.nextNode();
    }

    while (tnode && tnode.nodeName !== "DIV" && tnode.nodeName !== "P" && tnode.nodeName !== "LI" && tnode.nodeName !== "UL") 
    {
      if (tnode.nodeName === "CODE" && tnode.parentNode.nodeName === "DIV") 
        break;
      tnode = tnode.parentNode;
    }
    return tnode;
  }

  async new_answer_observer()
  {
    if (document.querySelector("main h1")) return;
    var now_main_length = document.querySelector("main").innerText.length;
    if (this.last_main_length === now_main_length) return;
    this.last_main_length = now_main_length;
    if (this.tts_player.now_generating !== null || this.tts_player.audio.paused === false) return;

    var tnode = this.get_last_node();
    this.tts_player.close();
    this.tts_player.okay_to_play = true; //okay to play의 값은 tts를 얻어오기 전에 true로 세팅돼야 함. 
    this.tts_player.now_generating = new GenerationManager(tnode);
    await this.tts_player.push_gen_target(tnode);
    var rect = tnode.getBoundingClientRect();
    this.tts_player.open(rect.left, rect.top, -24, 2, "object");
    this.tts_player.play();

  }
}



class TTSPlayer {
  constructor()
  {
    fetch(chrome.runtime.getURL('/tts_player.html'))
      .then(r => r.text())
      .then(html => { 
        document.body.insertAdjacentHTML('beforeend', html);

        this.dom_observer = new DOMObserver(this);

        this.obj = document.querySelector("div.tts_player");

        this.play_obj = this.obj.querySelector("div.play");
        this.play_obj.addEventListener("click", async ()=>{ 
          this.okay_to_play=true;
          await tts_player.push(this.selected_str);
          this.play();
        });

        this.pause_obj = this.obj.querySelector("div.pause");
        this.pause_obj.addEventListener("click", ()=>{ this.pause(); });
        this.pause_obj.classList.add("t_close");

        this.selected_obj = this.obj.querySelector("div.selected");
        this.selected_obj.classList.add("t_close");

        this.selected_obj.addEventListener("click", (e)=>{ this.ask_chatgpt(e.target.classList[0]); });

        this.close();
      });
    fetch(chrome.runtime.getURL('/api_key.html'))
      .then(r => r.text())
      .then(html => { this.api_key = html; }); 
   
    this.audio = new Audio();
    this.audio.addEventListener("ended", ()=>{this.play();});

    this.dict = {};

    this.okay_to_play = false;
    this.now_generating = null;
    this.selected_str = ""
    this.play_q = [];
    this.langname = this.get_langname();
  }
  
  ask_chatgpt(mode)
  {
    var target = document.querySelector("main").querySelector("form").querySelector("textarea");
    var text = this.selected_str;

    if (mode === "diff") 
    {
      if (target.value.includes("What is the difference between ") === false)
        text = `What is the difference between '${text}' and `;
      else
      {
        this.scroll_to_bottom();
        text = `${target.value}'${text}'?`;
      } 
    }
    else
    {
      this.scroll_to_bottom();
      if (mode === "meaning")
        text = `What is the meaning of '${text}'?`;
      if (mode === "inap")
        text = `Is it inappropriate to say '${text}'?`;
    }

    setTimeout(()=>{ target.value = text; }, 200);
    this.close();
  }

  scroll_to_bottom()
  {
    var iter = document.createNodeIterator(document.querySelector("main > div"), NodeFilter.SHOW_TEXT);
    var lastTextNode = null;
    var node;
    while (node = iter.nextNode())
      if (node.nodeType === Node.TEXT_NODE)
        lastTextNode = node;
    lastTextNode.parentElement.scrollIntoView();
  }

  play()
  {
    if (this.okay_to_play === false) return;
    if (this.play_obj.classList.contains("t_close") === false) 
      this.play_obj.classList.add("t_close");
    this.pause_obj.classList.remove("t_close");

    if (this.play_q.length > 0)
    {
      if (this.now_generating !== null) this.now_generating.log.push(this.play_q[0]);
      this.audio.src = this.play_q.shift();
      this.audio.play();
    }
    else if (this.now_generating === null)
      this.close();
  }

  close()
  {
    this.pause();
    this.play_q = [];
    this.obj.classList.add("t_close");
    this.now_generating = null;
  }

  pause()
  {
    if (this.pause_obj.classList.contains("t_close") === false)
      this.pause_obj.classList.add("t_close");
    this.play_obj.classList.remove("t_close");
    this.okay_to_play = false; //pause를 눌럿을 때에도 false로 만들어야 한다. 퍼즈 눌린 상태에서 get_tts 쪽 루틴이 돌아가면 좀...
    this.audio.pause();
  }

  open(x, y, offx, offy, mode)
  {
    if (mode === "object" && this.selected_obj.classList.contains("t_close") === false) 
      this.selected_obj.classList.add("t_close");
    else if (mode === "selected")
      this.selected_obj.classList.remove("t_close");

    this.obj.classList.remove("t_close");
    this.obj.style.top = y + offy + "px";
    this.obj.style.left = x + offx + "px";
  }

  async push(text)
  {
    if (text === "" && text === undefined) return;
    if (text in this.dict)
      this.play_q.push(this.dict[text]);
    else
    {
      var blob_src = await this.get_tts(text);
      this.dict[text] = blob_src;
      this.play_q.push(blob_src);
    }
  }
/*

okay to play를 만든 이유

1. 1회 클릭을 누른 후 tts api 요청을 보내고 기다리고 있는 도중에 2회 클릭을 눌러 tts_player.close()가 실행된 경우가 있다.

2. 이 경우 tts api 요청에 대한 응답이 돌아왔다 하더라도 거기서 바로 중단을 해야 하지만, 특별한 코드를 넣지 않는다면 중단이 되지 않는다.
   그 의미에서 이를 체크하기 위해 추가한 코드.

okay to play를 true로 만들어야 할 때: 재생을 해야 할 때. 최대한 빨리.
              false로 만들어야 할 때: 재생을 하면 안될 때. tts_player.close()가 실행됐을 때.

*/


  get_langname()
  {
    const rand_num = Math.floor(Math.random()*10);
    const name_char = 'CEFGHACFAC';
    const lang_code = (rand_num < 5) ? 'US' : ( (rand_num < 8) ? 'GB' : 'AU' );      
    return `en-${lang_code}-Wavenet-${name_char[rand_num]}`;
  }


  end_well(text)
  {
    return `.!?`.split("").some((c)=>text.endsWith(c));
  }

  is_it_new(text)
  {
    if (text === "" || text === undefined) return false;
    if (!(text in this.dict)) return true;
    if ((this.now_generating && this.now_generating.log.includes(this.dict[text])) || this.play_q.includes(this.dict[text])) return false;
    console.log(text);
    return true;
  }

  async push_gen_target(target)
  {
    var sentences = target.innerText.split(/[.!?:;]/);    

    if (sentences.length > 1 && this.is_it_new(sentences[0].trim()))
      this.push(sentences[0].trim());

    for (var i=1; i < sentences.length-1; i++)
      if (this.is_it_new(sentences[i].trim()))
        this.push(sentences[i].trim());

    if (this.end_well(target.innerText) && this.is_it_new(sentences[sentences.length-1].trim()))
      this.push(sentences[sentences.length-1].trim());

    if (this.audio.paused && this.play_q.length > 0)
      this.play();

    var now_time = (new Date()).getTime();
    var [ls, lt] = this.now_generating.last_sentence;
    if (ls === sentences[sentences.length-1].trim() && now_time - lt > 3000)
    {
      this.now_generating = null;
    }
    else if (this.now_generating && target === this.now_generating.target)
    {
      if (ls !== sentences[sentences.length-1].trim()) 
        this.now_generating.last_sentence = [sentences[sentences.length-1].trim(), now_time];
      setTimeout(async ()=>{await this.push_gen_target(target);}, 500);
    }
  }

  async get_tts(text)
  {
      var langname = this.langname;
      const params = {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ input: { text:text }, voice: {languageCode: langname.substring(0,5), name: langname}, audioConfig: { audioEncoding: 'LINEAR16'}}),
        };
  
      const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${this.api_key}`, params);
  
      const blob = new Blob([Uint8Array.from(atob((await response.json()).audioContent), c => c.charCodeAt(0))], { type: 'audio/mp3' });
      return URL.createObjectURL(blob);
  }  
}


class TheTextarea {
  constructor()
  {
    fetch(chrome.runtime.getURL('/saved_text.html'))
      .then(r => r.text())
      .then(html => { 

        this.text = html;
        setTimeout(()=>{this.fill_textarea();}, 700);

      });

    document.body.addEventListener("click", (e)=>{
      if (e.target.innerText === "New chat")
        setTimeout(()=>{ this.fill_textarea(); }, 500); 
    });
  }

  fill_textarea()
  {
    var target = document.querySelector("main").querySelector("form").querySelector("textarea");

    for (var h1 of document.getElementsByTagName("h1"))
      if (h1.innerText === "ChatGPT")
      {
        target.focus();
        target.value = this.text;
        target.style.height = `${24 * (this.text.split("\n").length + 1)}px`;
      }
  }
}

var fill_textarea = new TheTextarea();
var tts_player = new TTSPlayer();
var timer = false;

document.body.addEventListener("mouseup", async (e)=>{
  var selection = window.getSelection();

  var this_node = e.target;
  while (this_node && this_node.nodeName !== "MAIN" && this_node.nodeName !== "FORM") this_node = this_node.parentNode;
  if (this_node && this_node.nodeName === "MAIN") //main 파트 내 클릭이 있다면, 이 파트 내 첫 문단을 TTS 돌린다.
  {
    if (timer) //메인 클릭. 타이머 세팅 돼있음.
    {
      clearTimeout(timer);
      tts_player.close();
      timer = false;
      tts_player.now_generating = null;
      tts_player.okay_to_play = false;
    }
    else if (tts_player.audio.paused && selection.isCollapsed && tts_player.selected_str === "") //메인 클릭. 타이머 세팅 안돼있음. 재생중 아님. 블록 설정 텍스트 없음.
    {
      tts_player.close();

      var tnode = document.createNodeIterator(e.target, NodeFilter.SHOW_TEXT).nextNode();
      while (tnode && tnode.nodeName !== "DIV" && tnode.nodeName !== "P" && tnode.nodeName !== "LI" && tnode.nodeName !== "UL") 
      {
        if (tnode.nodeName === "CODE" && tnode.parentNode.nodeName === "DIV") 
          break;
        tnode = tnode.parentNode
      }

      if (tnode) //e.target의 부모 중에 div, p, li, ul가 있는 경우
      {
        tts_player.okay_to_play = true; //okay to play의 값은 tts를 얻어오기 전에 true로 세팅돼야 함. 
        if (tts_player.dom_observer.get_last_node() === tnode)
        {
          tts_player.now_generating = new GenerationManager(tnode);
          await tts_player.push_gen_target(tnode);
        }
        else
          await tts_player.push(tnode.innerText);
      }

      tts_player.play();

      timer = setTimeout(async ()=> {
        if (tts_player.okay_to_play)
        {
          var rect = tnode.getBoundingClientRect();
          tts_player.open(rect.left, rect.top, -24, 2, "object");
        }
        timer = false;
      }, 400);
    }
    else //메인 클릭. 타이머 세팅 안돼있음. 재생중이거나 블록 설정 텍스트 있음.
      tts_player.pause();
    
    tts_player.selected_str = "";
  }

  
  if(selection.isCollapsed === false && tts_player.audio.paused) //현재 재생중 아니고 텍스트 블록 선택 있으면 그 부분에 대한 재생창 띄운다. 사실 이것만 있어도 되긴 한데..
  {
    tts_player.close();
    tts_player.open(e.clientX, e.clientY, 20, 0, "selected");
    tts_player.selected_str = selection.toString();
    setTimeout(()=>{if(window.getSelection().isCollapsed)tts_player.close();}, 20)
  }

});
