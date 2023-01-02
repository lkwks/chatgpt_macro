
function save(key, value) {
    set_dict = {}
    set_dict[key] = value;
    chrome.storage.sync.set(set_dict);
  }

function render_saved_text(saved_text_dict, selected_text)
{
    var select_obj = document.querySelector("#saved_text select");
    var start_obj = document.querySelector("#start_with select");
    var box_obj = document.querySelector("#start_with item div:nth-child(2)")
    if (saved_text_dict)
    {
        for (const key of Object.keys(saved_text_dict))
        {
            if (key === "-1") continue;
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

    select_obj.addEventListener("click", (e)=>{
        if (e.target.nodeName === "OPTION")
        {
            select_obj.value = e.target.value;
            document.querySelector("#saved_text textarea").value = saved_text_dict[e.target.value];
        }
    });
    if(select_obj.querySelector("option"))
        select_obj.querySelector("option").click();

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
            var temp = saved_text[saved_text_obj.querySelector("select").value];
            delete saved_text[saved_text_obj.querySelector("select").value];
            saved_text[new_text_name] = temp;
            var select_obj = saved_text_obj.querySelector(`select option[value='${saved_text_obj.querySelector('select').value}']`);
            select_obj.text = new_text_name;
            select_obj.value = new_text_name;
            save("saved_text", JSON.stringify(saved_text));
        }
        saved_text_obj.querySelector(`select option[value='${new_text_name}']`).click();
        saved_text_obj.querySelector("div.add_text_name input").value = '';
        saved_text_obj.querySelector("button.new_text").click();
        window.location.reload();
    }    
}

async function restoreOptions() {
    const get_saved_text = ()=> {
        return new Promise((resolve, reject) => {
            chrome.storage.sync.get(null, (items) => {
                if (items.api_key)
                    document.querySelector("#api_key input").value = items.api_key;
               
                if (items.selected_text)
                    selected_text = new Set(JSON.parse(items.selected_text));

                if (items.saved_text)
                    for (const [key, val] of Object.entries(JSON.parse(items.saved_text)))
                        saved_text[key] = val;
                resolve([saved_text, selected_text]);
            });
        });   
    };
    [saved_text, selected_text] = await get_saved_text();
    render_saved_text(saved_text, selected_text);

    document.querySelector("#api_key button").addEventListener("click", ()=>{
        save("api_key", document.querySelector("#api_key input").value);
    });

    document.querySelector("#saved_text button.save_textarea").addEventListener("click", ()=>{
        var select_obj = document.querySelector("#saved_text select");
        if (select_obj.querySelector("option"))
            saved_text[select_obj.value] = document.querySelector("#saved_text textarea").value;
        save("saved_text", JSON.stringify(saved_text));
    });

    document.querySelector("#saved_text button.new_text").addEventListener("click", ()=>{
        add_text_name_mode = "new";
        document.querySelector("#saved_text div.add_text_name").classList.toggle("hide");
    });
    document.querySelector("#saved_text button.new_text").click();

    document.querySelector("#saved_text button.mod_text").addEventListener("click", ()=>{
        add_text_name_mode = "mod";
        document.querySelector("#saved_text div.add_text_name input").value = document.querySelector("#saved_text select").value;
        document.querySelector("#saved_text div.add_text_name").classList.remove("hide");
    });

    document.querySelector("#saved_text button.del_text").addEventListener("click", ()=>{
        var select_obj = document.querySelector("#saved_text select");
        if (select_obj.querySelector("option"))
        {
            delete saved_text[select_obj.value];
            save("saved_text", JSON.stringify(saved_text));
            window.location.reload();            
        }
    });

    document.querySelector("#saved_text button.save_text_name").addEventListener("click", ()=>{save_text_name_func(add_text_name_mode);});
    document.querySelector("#saved_text div.add_text_name input").addEventListener("keydown", (e)=>{if (e.key === "Enter")save_text_name_func(add_text_name_mode);});
}






document.addEventListener('DOMContentLoaded', async()=>await restoreOptions());
