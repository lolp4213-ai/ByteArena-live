// Simple browser download helper for files served by the Flask backend
// Use: call `downloadFile('game1.torrent')` from your page scripts

function downloadFile(filename) {
  if (!filename) return;
  const url = '/download/' + encodeURIComponent(filename);

  // Prefer using a link navigation so the browser handles Content-Disposition
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

window.downloadFile = downloadFile;
