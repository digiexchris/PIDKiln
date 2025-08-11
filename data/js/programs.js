// Some JS for PID kilin


function ValidateSize(file) {
        var FileSize = file.files[0].size / 1024; // in KiB
	var Name = file.files[0].name;
	if (Name.length > 20){
		alert("Program name cannot be longer then 20 characters. Sorry - limitation of SPIFFS");
		file.value = "";
	}
        if (FileSize > 10) {
		alert("Program file is too big - limit is 10 KiB !");
		file.value = "";
        }
}

// --- Program editor ---
(function(){
  function qs(sel, root){ return (root||document).querySelector(sel); }
  function qsa(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); }

  function bytesLength(str){
    try { return new TextEncoder().encode(str).length; } catch(e){ return str.length; }
  }

  function validFilename(name){
    if(!name) return false;
    if(name.length < 1 || name.length > 20) return false;
    if(name.indexOf('/') !== -1 || name.indexOf('\\') !== -1) return false;
    if(name.toLowerCase() === 'index.html') return false;
    if(!/\.txt$/i.test(name)) return false; // require .txt suffix
    if(name[0] === '.') return false; // no leading dot
    if(name.indexOf('..') !== -1) return false; // no consecutive dots
    return /^[A-Za-z0-9._]+$/.test(name);
  }

  function enhanceTable(){
    var table = qs('table');
    if(!table) return;
    var rows = qsa('tr', table).slice(2); // skip header and <hr> row
    rows.forEach(function(tr){
      var tds = tr.children;
      if(!tds || tds.length < 6) return;
      var nameCell = tds[1];
      var link = nameCell.querySelector('a');
      if(!link) return;
      var filename = (link.textContent || '').trim();
      var editCell = tds[4];
      // Append an Edit action next to existing content
      var span = document.createElement('span');
      span.innerHTML = ' | ';
      var a = document.createElement('a');
      a.href = '#';
      a.textContent = 'edit';
      a.addEventListener('click', function(e){ e.preventDefault(); openEditor(filename); });
      editCell.appendChild(span);
      editCell.appendChild(a);
    });
  }

  var currentFile = null;
  var isNewMode = false;

  function toggleNameInputs(){
    var nameSpan = qs('#editor_filename');
    var nameInput = qs('#editor_filename_input');
    if(!nameSpan || !nameInput) return;
    if(isNewMode){
      nameSpan.style.display = 'none';
      nameInput.style.display = '';
    } else {
      nameSpan.style.display = '';
      nameInput.style.display = 'none';
    }
  }

  function openNewEditor(){
    isNewMode = true;
    currentFile = null;
    var panel = qs('#editor_panel');
    var nameInput = qs('#editor_filename_input');
    var textarea = qs('#editor_text');
    if(!panel || !nameInput || !textarea) return;
    nameInput.value = 'new_program.txt';
    textarea.value = '';
    panel.style.display = 'block';
    toggleNameInputs();
  }

  function openEditor(filename){
    isNewMode = false;
    currentFile = filename;
    var panel = qs('#editor_panel');
    var fname = qs('#editor_filename');
    var textarea = qs('#editor_text');
    if(!panel || !fname || !textarea) return;
    fname.textContent = filename;
    textarea.value = '';
    panel.style.display = 'block';
    toggleNameInputs();
    // Load file content
    fetch('/programs/' + encodeURIComponent(filename), {credentials:'include', cache:'no-cache'})
      .then(function(r){ if(!r.ok) throw new Error('Failed to load file'); return r.text(); })
      .then(function(txt){ textarea.value = txt; })
      .catch(function(err){ alert('Error: ' + err.message); });
  }

  function hideEditor(){
    var panel = qs('#editor_panel');
    if(panel) panel.style.display = 'none';
    currentFile = null;
    isNewMode = false;
  }

  function saveEditor(){
    var textarea = qs('#editor_text');
    if(!textarea) return;
    var name;
    if(isNewMode){
      var nameInput = qs('#editor_filename_input');
      name = (nameInput && nameInput.value ? nameInput.value.trim() : '');
      if(!name){ alert('Enter a file name.'); return; }
      if(!/\.txt$/i.test(name)) name += '.txt'; // append .txt if missing
    } else {
      if(!currentFile) return;
      name = currentFile;
    }
    if(!validFilename(name)){ alert('Invalid file name. Use letters, numbers, dot, underscore; must end with .txt; no leading or consecutive dots; max 20 chars; not index.html.'); return; }

    var content = textarea.value || '';
    var size = bytesLength(content);
    if(size > 10*1024){ alert('Program too big: ' + size + ' bytes. Limit is 10240 bytes.'); return; }

    function doUpload(){
      var fd = new FormData();
      var blob = new Blob([content], {type:'text/plain'});
      fd.append('upload', blob, name);
      return fetch('/upload', {method:'POST', body: fd, credentials:'include'})
        .then(function(r){ if(!r.ok) throw new Error('Upload failed ('+r.status+').'); return r.text(); })
        .then(function(){ location.reload(); });
    }

    if(isNewMode){
      // Check if file exists to confirm overwrite
      fetch('/programs/' + encodeURIComponent(name), {method:'GET', credentials:'include', cache:'no-cache'})
        .then(function(r){
          if(r.ok){
            if(!confirm('File "' + name + '" already exists. Overwrite?')){ throw new Error('cancelled'); }
          }
        })
        .then(function(){ return doUpload(); })
        .catch(function(err){ if(err && err.message !== 'cancelled'){ alert('Save failed: ' + err.message); } });
    } else {
      doUpload().catch(function(err){ alert('Save failed: ' + err.message); });
    }
  }

  function wireEditorButtons(){
    var saveBtn = qs('#editor_save');
    var cancelBtn = qs('#editor_cancel');
    var newBtn = qs('#editor_new');
    if(saveBtn) saveBtn.addEventListener('click', function(e){ e.preventDefault(); saveEditor(); });
    if(cancelBtn) cancelBtn.addEventListener('click', function(e){ e.preventDefault(); hideEditor(); });
    if(newBtn) newBtn.addEventListener('click', function(e){ e.preventDefault(); openNewEditor(); });

    // Intercept classic upload form to behave like Save (fetch + reload)
    var uploadForm = qs('#upload_form');
    if(uploadForm){
      uploadForm.addEventListener('submit', function(e){
        e.preventDefault();
        var fileInput = qs('#upload_program');
        if(!fileInput || !fileInput.files || !fileInput.files[0]){ alert('Choose a file first.'); return; }
        var f = fileInput.files[0];
        var name = f.name;
        if(name.length > 20){ alert('Program name cannot be longer then 20 characters.'); return; }
        if(name[0] === '.' || name.indexOf('..') !== -1){ alert('Invalid filename.'); return; }
        if(name.indexOf('/') !== -1 || name.indexOf('\\') !== -1){ alert('Invalid filename.'); return; }
        if(!/^[A-Za-z0-9._]+$/.test(name)){ alert('Invalid filename.'); return; }
        if(!(/\.(txt|ino)$/i.test(name))){ alert('Filename must end with .txt or .ino'); return; }
        var fd = new FormData();
        fd.append('upload', f, name);
        fetch('/upload', {method:'POST', body: fd, credentials:'include'})
          .then(function(r){ if(!r.ok) throw new Error('Upload failed ('+r.status+').'); return r.text(); })
          .then(function(){ location.reload(); })
          .catch(function(err){ alert('Upload failed: ' + err.message); });
      });
    }
  }

  document.addEventListener('DOMContentLoaded', function(){
    try { enhanceTable(); wireEditorButtons(); } catch(e){}
  });
})();

