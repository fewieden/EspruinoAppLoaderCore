/* Library for 'custom' HTML files that are to
be used from within BangleApps

See: README.md / `apps.json`: `custom` element
*/

/* Call with a JS object:

sendCustomizedApp({
  id : "7chname",

  storage:[
    {name:"-7chname", content:app_source_code},
    {name:"+7chname", content:JSON.stringify({
      name:"My app's name",
      icon:"*7chname",
      src:"-7chname"
    })},
    {name:"*7chname", content:'require("heatshrink").decompress(atob("mEwg...4"))', evaluate:true},
  ]
});


If you define an `onInit` function, this is called
with information about the currently connected device,
for instance:

```
onInit({
  id : "BANGLEJS",
  version : "2v10",
  appsInstalled : [
    {id: "boot", version: "0.28"},
    ...
  ]
});
```

If no device is connected, some fields may not be populated.
*/
function sendCustomizedApp(app) {
  console.log("<CUSTOM> sending app");
  window.postMessage({
    type : "app",
    data : app
  });
}

let __id = 0, __idlookup = [];
const Puck = {
  eval : function(data,callback) {
    __id++;
    __idlookup[__id] = callback;
    window.postMessage({type:"eval",data:data,id:__id});
  },write : function(data,callback) {
    __id++;
    __idlookup[__id] = callback;
    window.postMessage({type:"write",data:data,id:__id});
  }
};

const Util = {
  readStorageFile : function(filename,callback) {
    __id++;
    __idlookup[__id] = callback;
    window.postMessage({type:"readstoragefile",data:filename,id:__id});
  },
  readStorage : function(filename,callback) {
    Puck.write(`\x10(function(filename) {
  var s = require("Storage").read(filename);
  for (var i=0;i<s.length;i+=384) Bluetooth.print(btoa(s.substr(i,384)));
})(${JSON.stringify(filename)});Bluetooth.println("");\n`, data => {
      callback(atobSafe(data.trim()));
    });
  },
  writeStorage : function(filename,data,callback) {
    Puck.write(`\x10require("Storage").write(${JSON.stringify(filename)}, ${JSON.stringify(data)});\n`, () => callback);
  },
  eraseStorageFile : function(filename,callback) {
    Puck.write(`\x10require("Storage").open(${JSON.stringify(filename)},"r").erase()\n`,callback);
  },
  eraseStorage : function(filename,callback) {
    Puck.write(`\x10require("Storage").erase(${JSON.stringify(filename)})\n`,callback);
  },
  showModal : function(title) {
    if (!Util.domModal) {
      Util.domModal = document.createElement('div');
      Util.domModal.id = "status-modal";
      Util.domModal.classList.add("modal");
      Util.domModal.classList.add("active");
      Util.domModal.innerHTML = `<div class="modal-overlay"></div>
      <div class="modal-container">
        <div class="modal-header">
          <div class="modal-title h5">Please wait</div>
        </div>
        <div class="modal-body">
          <div class="content">
            Loading...
          </div>
        </div>
      </div>`;
      document.body.appendChild(Util.domModal);
    }
    Util.domModal.querySelector(".content").innerHTML = title;
    Util.domModal.classList.add("active");
  },
  hideModal : function() {
    if (!Util.domModal) return;
    Util.domModal.classList.remove("active");
  },
  saveCSV : function(filename, csvData) {
    let a = document.createElement("a"),
      file = new Blob([csvData], {type: "Comma-separated value file"});
    let url = URL.createObjectURL(file);
    a.href = url;
    a.download = filename+".csv";
    document.body.appendChild(a);
    a.click();
    setTimeout(function() {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 0);
  }
};
window.addEventListener("message", function(event) {
  let msg = event.data;
  if (msg.type=="init") {
    console.log("<CUSTOM> init message received", msg.data);
    if (msg.expectedInterface != "customize.js")
      console.error("<CUSTOM> WRONG FILE IS INCLUDED, use "+msg.expectedInterface+" instead");
    if ("undefined"!==typeof onInit)
      onInit(msg.data);
  } else if (msg.type=="evalrsp" || msg.type=="writersp"|| msg.type=="readstoragefilersp") {
    let cb = __idlookup[msg.id];
    delete __idlookup[msg.id];
    cb(msg.data);
  }
}, false);

// version of 'window.atob' that doesn't fail on 'not correctly encoded' strings
function atobSafe(input) {
  // Copied from https://github.com/strophe/strophejs/blob/e06d027/src/polyfills.js#L149
  // This code was written by Tyler Akins and has been placed in the
  // public domain.  It would be nice if you left this header intact.
  // Base64 code from Tyler Akins -- http://rumkin.com
  var keyStr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

  var output = '';
  var chr1, chr2, chr3;
  var enc1, enc2, enc3, enc4;
  var i = 0;
  // remove all characters that are not A-Z, a-z, 0-9, +, /, or =
  input = input.replace(/[^A-Za-z0-9+/=]/g, '');
  do {
    enc1 = keyStr.indexOf(input.charAt(i++));
    enc2 = keyStr.indexOf(input.charAt(i++));
    enc3 = keyStr.indexOf(input.charAt(i++));
    enc4 = keyStr.indexOf(input.charAt(i++));

    chr1 = (enc1 << 2) | (enc2 >> 4);
    chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
    chr3 = ((enc3 & 3) << 6) | enc4;

    output = output + String.fromCharCode(chr1);

    if (enc3 !== 64) {
      output = output + String.fromCharCode(chr2);
    }
    if (enc4 !== 64) {
      output = output + String.fromCharCode(chr3);
    }
  } while (i < input.length);
  return output;
}
