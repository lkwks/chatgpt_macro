
function save(key, value) {
    chrome.storage.sync.set({[key]: value});
  }

function render_saved_text(saved_text_dict, selected_text)
{
    var saved_obj = document.querySelector("#saved_text");
    var select_obj = saved_obj.querySelector("select");
    var textarea_obj = saved_obj.querySelector("textarea");
    var input_obj = saved_obj.querySelector("div.add_text_name input");
    var start_obj = document.querySelector("#start_with select");
    var box_obj = document.querySelector("#start_with item div:nth-child(2)");
    
    if (saved_text_dict)
    {
        for (const key of Object.keys(saved_text_dict))
        {
            if (key === "-1") continue;
            if (textarea_obj.value === "") textarea_obj.value = saved_text_dict[key];
            var opt = document.createElement("option");
            opt.text = key;
            opt.value = key;
            select_obj.add(opt);
        }
        start_obj.innerHTML = select_obj.innerHTML;
        var opt = document.createElement("option");
        opt.text = "Select";
        opt.value = -1;
        start_obj.insertBefore(opt, start_obj.firstChild);
        start_obj.selectedIndex = 0;

        for (const key of selected_text)
        {
            var button_obj = document.createElement("button");
            button_obj.classList.add("macro_button");
            button_obj.innerText = key;
            box_obj.appendChild(button_obj);
        }
    }

    select_obj.addEventListener("change", ()=>{
        textarea_obj.value = saved_text_dict[select_obj.value];
    });

    if(select_obj.querySelector("option") && window.location.href.includes("?opt="))
    {
        var opt = decodeURI(window.location.href).split("?opt=")[1], sel_id = null;
        select_obj.querySelectorAll("option").forEach((elem, i) => {
            if (elem.value === opt)
                sel_id = i;
        });
        if (sel_id)
        {
            select_obj.selectedIndex = sel_id;
            textarea_obj.value = saved_text_dict[opt];
        }
    }

    start_obj.addEventListener("change", ()=>{
        if (selected_text.has(start_obj.value) === false && start_obj.value !== "-1")
        {
            var button_obj = document.createElement("button");
            button_obj.classList.add("macro_button");
            button_obj.innerText = start_obj.value;

            selected_text.add(start_obj.value);
            box_obj.appendChild(button_obj);
            start_obj.selectedIndex = 0;
            save("selected_text", JSON.stringify(Array.from(selected_text)));
        }
    });


    box_obj.addEventListener("click", (e)=>{ 
        if (e.target.nodeName === "BUTTON")
        {
          box_obj.removeChild(e.target); 
          selected_text.delete(e.target.innerText);
          save("selected_text", JSON.stringify(Array.from(selected_text)));
        }
      });    

    saved_obj.querySelector("button.save_textarea").addEventListener("click", ()=>{
        if (select_obj.querySelector("option"))
            saved_text[select_obj.value] = textarea_obj.value;
        save("saved_text", JSON.stringify(saved_text));
    });

    saved_obj.querySelector("button.new_text").addEventListener("click", ()=>{
        add_text_name_mode = "new";
        input_obj.value = '';
        saved_obj.querySelector("div.add_text_name").classList.toggle("hide");
    });

    saved_obj.querySelector("button.new_text").click();

    saved_obj.querySelector("button.mod_text").addEventListener("click", ()=>{
        add_text_name_mode = "mod";
        input_obj.value = select_obj.value;
        saved_obj.querySelector("div.add_text_name").classList.toggle("hide");
    });

    saved_obj.querySelector("button.del_text").addEventListener("click", ()=>{
        if (select_obj.querySelector("option"))
        {
            delete saved_text[select_obj.value];
            save("saved_text", JSON.stringify(saved_text));
            window.location.href = window.location.href.split("?")[0];
        }
    });

    saved_obj.querySelector("button.save_text_name").addEventListener("click", ()=>{save_text_name_func(add_text_name_mode);});
    input_obj.addEventListener("keydown", (e)=>{if (e.key === "Enter")save_text_name_func(add_text_name_mode);});

}

let saved_text = {"-1":""}, add_text_name_mode = "", selected_text = new Set();

function save_text_name_func(mode)
{
    var saved_text_obj = document.querySelector("#saved_text"); 
    var new_text_name = saved_text_obj.querySelector("div.add_text_name input").value.trim();

    if (new_text_name !== "")
    {
        if (mode === "new")
        {
            saved_text[new_text_name] = "";
            var opt = document.createElement("option");
            opt.text = new_text_name;
            opt.value = new_text_name;
            saved_text_obj.querySelector("select").add(opt);
            save("saved_text", JSON.stringify(saved_text));
        }
        else
        {
            var old_val = saved_text_obj.querySelector("select").value;
            var temp = saved_text[old_val];
            delete saved_text[old_val];
            saved_text[new_text_name] = temp;
            var select_obj = saved_text_obj.querySelector(`select option[value='${saved_text_obj.querySelector('select').value}']`);
            select_obj.text = new_text_name;
            select_obj.value = new_text_name;
            save("saved_text", JSON.stringify(saved_text));

            selected_text.delete(old_val);
            selected_text.add(new_text_name);
            save("selected_text", JSON.stringify(Array.from(selected_text)));

            chrome.storage.sync.get(["text_used_num"], (items) => {
                if (items.text_used_num)
                {
                    var used_num = JSON.parse(items.text_used_num);
                    var temp = used_num[old_val];
                    delete used_num[old_val];
                    used_num[new_text_name] = temp;
                    save("text_used_num", JSON.stringify(used_num));
                }
            });

        }
        window.location.href = encodeURI(`${window.location.href}?opt=${new_text_name}`);
    }    
}


async function get_saved_text()
{
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get(null, (items) => {
            console.log(items);
            if (items.api_key)
                document.querySelector("#api_key input").value = items.api_key;
           
            if (items.selected_text)
            try{
                selected_text = new Set(JSON.parse(items.selected_text));
            }
            catch {
                selected_text = [];
                chrome.storage.sync.set({"selected_text": JSON.stringify(selected_text)});
            }

            if (items.tts_generating && items.tts_generating === "true")
                document.querySelector("#tts_generating input").checked = true;

            if (items.saved_text)
                for (const [key, val] of Object.entries(JSON.parse(items.saved_text)))
                    saved_text[key] = val;
            document.querySelector("#restore_backup textarea").value = JSON.stringify(items);
            resolve([saved_text, selected_text]);
        });
    });   
}


async function restoreOptions() {
    render_saved_text(...(await get_saved_text()));

    document.querySelector("#api_key button").addEventListener("click", ()=>{
        save("api_key", document.querySelector("#api_key input").value);
    });


    document.querySelector("#restore_backup button").addEventListener("click", ()=>
    {
        try {
            if (document.querySelector("#restore_backup textarea").value.length > 100)
                chrome.storage.sync.set(JSON.parse(document.querySelector("#restore_backup textarea").value), ()=>{
                    window.location.href = window.location.href.split("?")[0];
                });
        }
        catch(e){
            console.log(e);
        }
    });

    document.querySelector("#tts_generating input").addEventListener("change", (e)=>{
        if (e.target.checked)
           save("tts_generating", "true");
        else
            save("tts_generating", "false");
    });
}






document.addEventListener('DOMContentLoaded', async()=>await restoreOptions());
