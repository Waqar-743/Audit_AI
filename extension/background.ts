chrome.action.onClicked.addListener((tab) => {
  if (tab.id === undefined) return;
  // Opening must remain directly inside the user gesture.
  void chrome.sidePanel.open({ tabId: tab.id }).catch(() => {
    // Chrome may close the tab while the gesture is being handled.
  });
});
