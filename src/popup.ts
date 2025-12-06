const startSessionButton = document.getElementById("start_session_btn");
const stopSessionButton = document.getElementById("stop_session_btn");
const downloadSessionButton = document.getElementById("download_session_btn");

startSessionButton?.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "START_SESSION" });
});

stopSessionButton?.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "STOP_SESSION" });
});

downloadSessionButton?.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "DOWNLOAD_SESSION" });
});
