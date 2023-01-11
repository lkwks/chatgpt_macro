class GenerationManager {
  constructor(target)
  {
   this.target = target;
   this.log = []; 
   this.ready_q = [];
   this.last_sentence = ["", 0];
  }
}

class DOMObserver {
  constructor(tts_player)
  {
/*

domobserver 운영 전략

1. 0.5초 주기로 document.querySelector("main") 오브젝트를 새로 얻어와 안에 h1이 사라졌는지 확인한다.

2. h1이 사라진 경우에 한해 observer의 루틴 함수
(=main 오브젝트 내 텍스트 길이가 증가했는지를 확인하고, 증가했다면 그에 대한 제너레이션 매니저를 실행)를 실행시킨다. 

*/
    this.textarea_macro = new TextareaMacro();
    setInterval(async ()=>{
      await this.new_answer_observer();
      if(this.textarea_macro.storage_load)
        this.textarea_macro.render();
      if(window.getSelection().isCollapsed)this.tts_player.close();
    }, 500);
    this.last_main_length = -1;
    this.tts_player = tts_player;
    this.href = "";

    document.body.addEventListener("click", (e)=>{
      var node = e.target, a_parent = e.target;
      while (node && node.nodeName !== "NAV")
        node = node.parentNode;
      while (a_parent && a_parent.nodeName !== "A")
        a_parent = a_parent.parentNode;
      
      if (node && node.nodeName === "NAV" && document.querySelector("main form select"))
      {
        setTimeout(()=>{
          if (document.querySelector("main form select"))
          {
        var macro_box_obj = document.querySelector("main form select").parentNode;
        macro_box_obj.querySelectorAll("button").forEach((elem)=>
        {
          macro_box_obj.removeChild(elem);
        });
      }
      this.textarea_macro.selected_text = new Set();  
      this.textarea_macro.render();
      if (a_parent && a_parent === document.querySelector("nav a"))
        this.textarea_macro.initialize();
    }, 500);
      }
      if (a_parent && a_parent === document.querySelector("nav a"))
      {
        this.textarea_macro.initialize();
      }
    });

    this.detect_h1();
  }

  detect_h1()
  {
    if (this.textarea_macro.storage_load && document.querySelector("main h1"))
    {
      this.textarea_macro.initialize();
    }
    else setTimeout(()=>this.detect_h1(), 500);
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

    while (tnode && tnode.nodeName !== "DIV") 
      tnode = tnode.parentNode;
    return tnode;
  }

  async new_answer_observer()
  {
    if (document.querySelector("main form input") && document.querySelector("main form input").checked === false) return;
    if (this.last_main_length === -1)
    {
      if(document.querySelector("main"))
      { 
        this.last_main_length = document.querySelector("main div").innerText.length;
        this.href = window.location.href;
      }
      else return;
    }
    if (document.querySelector("main h1") || !document.querySelector("main")) return;
    var now_main_length = document.querySelector("main div").innerText.length;

    if (this.tts_player.now_playing_target && this.tts_player.selected_str === "")
    {
      var rect = this.tts_player.now_playing_target.getBoundingClientRect();
      this.tts_player.open(rect.left, rect.top, -24, 2, "object");
    }

    if (this.tts_player.audio.paused === false) // 현재 재생 상태면 push_gen 안돌린다.
    {
      this.last_main_length = now_main_length;
      return;
    }
    
    if (this.last_main_length === now_main_length || Math.abs(this.last_main_length - now_main_length) === 6) return;
    this.last_main_length = now_main_length;
    if (this.href !== window.location.href)
    {
      this.href = window.location.href;
      return;
    }
    if (this.tts_player.now_generating !== null) return;

    var tnode = this.get_last_node();

    this.tts_player.close();
    this.tts_player.now_playing_target = tnode;
    this.tts_player.okay_to_play = true; //okay to play의 값은 tts를 얻어오기 전에 true로 세팅돼야 함. 
    this.tts_player.now_generating = new GenerationManager(tnode);
    await this.tts_player.push_gen_target(tnode);
    var rect = tnode.getBoundingClientRect();
    this.tts_player.open(rect.left, rect.top, -24, 2, "object");
    this.tts_player.play();
    this.tts_player.scroll_to_bottom();

  }
}



class TTSPlayer {
  constructor()
  {
    fetch(chrome.runtime.getURL('/tts_player.html'))
      .then(r => r.text())
      .then(html => { 
        document.body.insertAdjacentHTML('beforeend', html);

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

    chrome.storage.sync.get(null, (items) => { this.api_key = items.api_key; });
   
    this.audio = new Audio();
    this.audio.addEventListener("ended", ()=>{this.play();});

    this.dict = {};
    this.okay_to_play = false;
    this.now_generating = null;
    this.selected_str = ""
    this.play_q = [];
    this.langname = this.get_langname();
    this.now_playing_target = null;
    this.question_start = false;
  }
  
  ask_chatgpt(mode)
  {

    var target = document.querySelector("main").querySelector("form").querySelector("textarea");
    var text = `'${this.selected_str}'`;

    if (mode === "add") 
      text = `${target.value} ${text}`;

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
    this.now_playing_target = null;
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
    if (text === "" || text === undefined || this.is_it_new(text) === false) return;

    if (text.includes("Answer:"))
      this.question_start = false;
    if (text.includes("Question:"))
      this.question_start = true;
    if (this.question_start) return;

    if (text in this.dict)
      this.play_q.push(this.dict[text]);
    else
    {
      if (this.now_generating)
        this.now_generating.ready_q.push(text);
      var blob_src = await this.get_tts(text.replace("Answer: ", ""));
      if (text in this.dict || (this.now_generating && this.now_generating.log.includes(this.dict[text])) || this.play_q.includes(this.dict[text])) return;
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
    return `.!?\n`.split("").some((c)=>text.endsWith(c));
  }

  is_it_new(text)
  {
    if (text === "" || text === undefined || (this.now_generating && this.now_generating.ready_q.includes(text))) return false;
    if (!(text in this.dict)) return true;
    if ((this.now_generating && this.now_generating.log.includes(this.dict[text])) || this.play_q.includes(this.dict[text])) return false;
    return true;
  }

  async push_gen_target(target)
  {
    var innerText = target.innerText;    
    var sentences = innerText.split(/[.!?]\s|\n/).map(x=>x.trim());

    if (sentences.length > 1)
      await this.push(sentences[0]);

    for (var i=1; i < sentences.length-1; i++)
      await this.push(sentences[i]);

    if (this.end_well(innerText))
      await this.push(sentences[sentences.length-1].replace(/[.!?]|\n/, ""));

    if (document.querySelector("main form input") && document.querySelector("main form input").checked === false) 
    {
      this.close();
      return;
    }

    if (this.audio.paused && this.play_q.length > 0)
      this.play();

    if (!this.now_generating) return;
    var now_time = (new Date()).getTime();
    var [ls, lt] = this.now_generating.last_sentence;
    if (ls === sentences[sentences.length-1] && now_time - lt > 3000)
      this.now_generating = null;
    else if (this.now_generating && target === this.now_generating.target)
    {
      if (ls !== sentences[sentences.length-1] && sentences[sentences.length-1] !== "") 
        this.now_generating.last_sentence = [sentences[sentences.length-1], now_time];
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


class TextareaMacro {
  constructor()
  {
    this.selected_text = new Set();
    this.macro_box_obj = document.createElement("div");
    this.storage_load = false;
    this.text_used_num = {};

    chrome.storage.sync.get(null, (items) => { 
      this.saved_text = (items.saved_text) ? JSON.parse(items.saved_text) : {};
      this.selected_text = (items.selected_text) ? new Set(JSON.parse(items.selected_text)) : new Set();
      this.text_used_num = (items.text_used_num) ? JSON.parse(items.text_used_num) : {};

      var checkbox_obj = document.createElement("input");
      checkbox_obj.type = "checkbox";
      checkbox_obj.checked = (items.tts_generating && items.tts_generating === "true");
      this.macro_box_obj.appendChild(checkbox_obj);

      var text_used_num_arr = [];
      for (var key of Object.keys(this.saved_text))
        text_used_num_arr.push({[key]:(key in this.text_used_num)?this.text_used_num[key]:0});
      text_used_num_arr.sort((a, b)=>{
        const aval = Object.values(a)[0], bval = Object.values(b)[0];
        if (aval < bval || Object.keys(b)[0] === "-1") return 1;
        if (aval > bval || Object.keys(a)[0] === "-1") return -1;
        return 0;
      });

      var select_list = document.createElement("select");
      select_list.classList.add("macro_select");
      for (var elem of text_used_num_arr)
      {
        var opt = document.createElement("option"), key = Object.keys(elem)[0];
        opt.text = (key === "-1")? "Select" : key;
        opt.value = key;
        select_list.appendChild(opt);
      }
      select_list.addEventListener("change", ()=>{
        if (this.selected_text.has(select_list.value) === false && select_list.value !== "-1")
        {
          this.selected_text.add(select_list.value);
          this.macro_box_obj.appendChild(this.button_obj(select_list.value));
          if (select_list.value in this.text_used_num)
            this.text_used_num[select_list.value]++;
          else
            this.text_used_num[select_list.value] = 1;
          chrome.storage.sync.set({"text_used_num": JSON.stringify(this.text_used_num)});
          select_list.selectedIndex = 0;
        }
      });

      this.macro_box_obj.appendChild(select_list);
      this.macro_box_obj.addEventListener("click", (e)=>{ 
        if (e.target.nodeName === "BUTTON")
        {
          this.macro_box_obj.removeChild(e.target);
          document.querySelector("main form textarea").value = document.querySelector("main form textarea").value.replace(`(${this.saved_text[e.target.innerText]}) `, "") 
          this.selected_text.delete(e.target.innerText);
          if (document.getElementById(`button_${e.target.innerText}`).classList.contains("hide") === false)
            document.getElementById(`button_${e.target.innerText}`).classList.add("hide");
        }
      });
      this.macro_box_obj.addEventListener("mouseover", (e)=>{
        var desc_obj = document.getElementById(`button_${e.target.innerText}`);
        if (e.target.nodeName === "BUTTON")
        {
          desc_obj.classList.remove("hide");
          var rect1 = e.target.getBoundingClientRect();
          var rect2 = desc_obj.getBoundingClientRect();
          desc_obj.style.top = rect1.top - rect2.height + "px";
          desc_obj.style.left = rect1.left - rect2.width/2 + rect1.width/2 + "px";
        }
      });
  
      this.storage_load = true;
    });

    document.body.addEventListener("click", ()=>{
          setTimeout(()=>{ this.render(); }, 500);
    });
  }

  initialize()
  {
    chrome.storage.sync.get(null, (items) => { 
      var macro_box_obj = document.querySelector("main form select").parentNode;
      var target = document.querySelector("main form textarea"); 
      macro_box_obj.querySelectorAll("button").forEach((elem)=>
      {
        macro_box_obj.removeChild(elem);
      });
      this.selected_text = (items.selected_text) ? new Set(JSON.parse(items.selected_text)) : new Set();
      for (var key of this.selected_text)
      {
        macro_box_obj.appendChild(this.button_obj(key));
        if (target.value.includes(this.saved_text[key]) === false)
          target.value += `(${this.saved_text[key]}) `;
      }
      target.style.height = `${24 * (target.value.split("\n").length + 1)}px`;
    });
  }

  button_obj(val)
  {
    var button_obj = document.createElement("button");
    button_obj.classList.add("macro_button");
    button_obj.innerText = val;

    var desc_obj = document.getElementById(`button_${val}`)
    if (!desc_obj)
    { 
      desc_obj = document.createElement("div");
      desc_obj.setAttribute("id", `button_${val}`);
      desc_obj.classList.add("macro_desc", "hide");
      desc_obj.innerText = this.saved_text[val];
      desc_obj.addEventListener("mouseout", ()=>{ desc_obj.classList.add("hide"); });
      document.body.appendChild(desc_obj);
    }
    button_obj.addEventListener("mouseout", ()=>{ desc_obj.classList.add("hide"); });

    return button_obj;
  }


/*

버튼 삭제
1. 버튼 눌렀을 때
2. submit_action() 실행 후
3. New chat 페이지 나타났을 때
4. 새로운 페이지로 넘어갔을 때

New chat 페이지 나타났을 때 selected_text가 storage에서 로드되는데.


*/

  submit_action(target)
  {
    for (var key of this.selected_text)
      if (target.value.includes(this.saved_text[key]) === false)
        target.value += ` (${this.saved_text[key]})`;
    document.querySelector("main form select").parentNode.querySelectorAll("button").forEach((elem)=>this.macro_box_obj.removeChild(elem));
    this.selected_text = new Set();
  }

  render()
  {
    if (!document.querySelector("main")) return;
    var target = document.querySelector("main").querySelector("form").querySelector("textarea");
    if (target === null || target.parentNode.querySelector("select")) 
      return;

    target.parentNode.insertBefore(this.macro_box_obj, target);  
    target.addEventListener("keydown", (e)=>{ if (e.key === "Enter" && e.shiftKey === false) this.submit_action(target); });
    target.nextSibling.addEventListener("click", ()=>{ this.submit_action(target) });
  }
}

var tts_player = new TTSPlayer();
var dom_observer = new DOMObserver(tts_player);
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
        tts_player.now_playing_target = tnode;
        if (dom_observer.get_last_node() === tnode)
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
    tts_player.now_playing_target = selection.focusNode.parentNode;
    tts_player.open(e.clientX, e.clientY, 20, 0, "selected");
    tts_player.selected_str = selection.toString();
  }

});
