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

  function openEditor(filename){
    currentFile = filename;
    var panel = qs('#editor_panel');
    var fname = qs('#editor_filename');
    var textarea = qs('#editor_text');
    if(!panel || !fname || !textarea) return;
    fname.textContent = filename;
    textarea.value = '';
    panel.style.display = 'block';
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
  }

  function saveEditor(){
    var textarea = qs('#editor_text');
    if(!currentFile || !textarea) return;
    var name = currentFile;
    if(name.length > 20){ alert('Program name too long (max 20).'); return; }
    var content = textarea.value || '';
    var size = bytesLength(content);
    if(size > 10*1024){ alert('Program too big: ' + size + ' bytes. Limit is 10240 bytes.'); return; }
    var fd = new FormData();
    var blob = new Blob([content], {type:'text/plain'});
    fd.append('upload', blob, name);
    fetch('/upload', {method:'POST', body: fd, credentials:'include'})
      .then(function(r){ if(!r.ok) throw new Error('Upload failed ('+r.status+').'); return r.text(); })
      .then(function(){
        // On success, reload to refresh index generated on device
        location.reload();
      })
      .catch(function(err){ alert('Save failed: ' + err.message); });
  }

  function wireEditorButtons(){
    var saveBtn = qs('#editor_save');
    var cancelBtn = qs('#editor_cancel');
    if(saveBtn) saveBtn.addEventListener('click', function(e){ e.preventDefault(); saveEditor(); });
    if(cancelBtn) cancelBtn.addEventListener('click', function(e){ e.preventDefault(); hideEditor(); });
  }

  document.addEventListener('DOMContentLoaded', function(){
    try { enhanceTable(); wireEditorButtons(); } catch(e){}
  });
})();

