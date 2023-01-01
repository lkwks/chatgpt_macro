
function save(key, value) {
    set_dict = {}
    set_dict[key] = value;
    chrome.storage.sync.set(set_dict);
  }

function render_saved_text(saved_text_dict)
{
    var select_obj = document.querySelector("#saved_text select");
    if (saved_text_dict)
        for (const key of Object.keys(saved_text_dict))
        {
            if (key === "-1") continue;
            var opt = document.createElement("option");
            opt.text = key;
            opt.value = key;
            select_obj.add(opt);
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
}

let saved_text = {"-1":""};

function save_text_name_func()
{
    var saved_text_obj = document.querySelector("#saved_text"); 
    var new_text_name = saved_text_obj.querySelector("div.add_text_name input").value.trim();
    if (new_text_name !== "")
    {
        saved_text[new_text_name] = "";
        var opt = document.createElement("option");
        opt.text = new_text_name;
        opt.value = new_text_name;
        saved_text_obj.querySelector("select").add(opt);
        save("saved_text", JSON.stringify(saved_text));
        saved_text_obj.querySelector(`select option[value='${new_text_name}']`).click();
        saved_text_obj.querySelector("div.add_text_name input").value = '';
        saved_text_obj.querySelector("button.add_text").click();
    }    
}

async function restoreOptions() {
    const get_saved_text = ()=> {
        return new Promise((resolve, reject) => {
            chrome.storage.sync.get(null, (items) => {
                if (items.api_key)
                    document.querySelector("#api_key input").value = items.api_key;
                if (items.saved_text)
                    for (const [key, val] of Object.entries(JSON.parse(items.saved_text)))
                        saved_text[key] = val;
                resolve(saved_text);
            });
        });   
    };
    saved_text = await get_saved_text();
    render_saved_text(saved_text);

    document.querySelector("#api_key button").addEventListener("click", ()=>{
        save("api_key", document.querySelector("#api_key input").value);
    });

    document.querySelector("#saved_text button.save_textarea").addEventListener("click", ()=>{
        var select_obj = document.querySelector("#saved_text select");
        if (select_obj.querySelector("option"))
            saved_text[select_obj.value] = document.querySelector("#saved_text textarea").value;
        save("saved_text", JSON.stringify(saved_text));
    });

    document.querySelector("#saved_text button.add_text").addEventListener("click", ()=>{
        document.querySelector("#saved_text div.add_text_name").classList.toggle("hide");
    });
    document.querySelector("#saved_text button.add_text").click();

    document.querySelector("#saved_text button.del_text").addEventListener("click", ()=>{
        var select_obj = document.querySelector("#saved_text select");
        if (select_obj.querySelector("option"))
        {
            delete saved_text[select_obj.value];
            save("saved_text", JSON.stringify(saved_text));
            select_obj.removeChild(document.querySelector(`#saved_text select option[value='${select_obj.value}']`));
            if(select_obj.querySelector("option"))
                select_obj.querySelector("option").click();
        }
    });

    document.querySelector("#saved_text button.save_text_name").addEventListener("click", ()=>{save_text_name_func();});
    document.querySelector("#saved_text div.add_text_name input").addEventListener("keydown", (e)=>{if (e.key === "Enter")save_text_name_func();});
}






document.addEventListener('DOMContentLoaded', async()=>await restoreOptions());