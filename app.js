const testUrl = 'https://cybexbi.github.io/pwa/index.html';

fetch(testUrl)
  .then(res => res.text())
  .then(text => console.log("✅ Network OK! Output length:", text.length))
  .catch(err => console.error("❌ Your Network/Node environment is entirely blocking fetches:", err.message));