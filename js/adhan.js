const aap = document.getElementById('adhanAudioPlayer');

chrome.runtime.onMessage.addListener(msg => {
    if ('audioID' in msg) {
        if (aap.paused) {
            aap.src = '/adhans/' + msg.audioID + '.mp3';
            aap.play();
        }
    }
    else if ('stopAdhanCall' in msg) {
        aap.pause();
        aap.currentTime = 0;
    }
});

aap.onended = () => {
    navigator.serviceWorker.controller.postMessage({ endAdhanCall: true })
};
