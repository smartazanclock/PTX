let appSettings = {};
let adhanStatus = {};

chrome.runtime.onMessage.addListener((msg) => { if ('runApp' in msg) { runApp() } });

$(function () {
    goGoRun('1stLoad');
    setInterval(goGoRun, 1000);
});

const goGoRun = (info) => {
    navigator.serviceWorker.controller.postMessage({ goGoRun: (info ?? '') })
}

const runApp = async () => {

    let result = await chrome.storage.local.get(['appSettings']);
    appSettings = result.appSettings;
    let asResult = await chrome.storage.local.get(['adhanStatus']);
    if (asResult.adhanStatus)
        adhanStatus = asResult.adhanStatus;

    $('#clock').attr("src", appSettings.clock);
    $('.menu-clock-img').attr("src", appSettings.icon);
    $('#iconImg').attr("src", appSettings.icon);
    $('#barImg').attr("src", appSettings.bar);

    $('#elapsedText').html(appSettings.elapsedText);
    $('#nextText').css("background-color", appSettings.iconColor);
    $('#nextText').css("color", appSettings.iconTextColor);
    $('#nextText').html(appSettings.nextText);
    $('#ntTitle').html(appSettings.nextTextTitle);

    $('#todaysDate').text(appSettings.todaysDate);
    $('.todaysDateArabic').text(appSettings.todaysDateArabic);

    $('#remainingForIftar').hide();
    if (appSettings.remainingForIftar) {
        $('#remainingForIftar').html(appSettings.remainingForIftar).show();
    }

    Object.entries(appSettings.i18n).forEach(function ([key, value]) {
        $('#' + key).text(value);
        $('.' + key).text(value);
    });

    $('.vakitDiv').hide();
    for (let i = 0; i < appSettings.appVakits.length; i++) {
        let vakit = appSettings.appVakits[i].name.toLowerCase();
        let vd = $('.' + vakit + 'Div');
        let timeValue = appSettings.appVakits[i].displayTime;

        if (vakit === "duha") {
            let duhaend = appSettings.allVakits.find(f => f.name === 'Duhaend');
            let duhaendTime = duhaend.displayTime;
            timeValue += " - " + duhaendTime;
        }

        let vakitText = appSettings.i18n[vakit + 'Text'];
        if (appSettings.isJumua && vakit === 'dhuhr')
            vakitText = appSettings.i18n.jumuaText

        vd.html(`
                <div class="pt-1 small">
                    ${vakitText}
                </div>
                <div class="p-1 vakitTime">
                    ${timeValue}
                </div>
            `);

        let cClass = 'bg-dark border border-light rounded';
        vd.removeClass(cClass);
        if (appSettings.appVakits[i].isCurrentVakit == 1) {
            vd.addClass(cClass);
        }

        if (i < Math.ceil(appSettings.appVakits.length / 2))
            $('#vakitsRow1').append(vd);
        else
            $('#vakitsRow2').append(vd);
        vd.show();
    }

    setFields(appSettings);

}

$(function () {

    $("#menu-div-clock").click(function (e) {
        $('.menu-div').removeClass('bg-secondary');
        $('#menu-div-clock').addClass('bg-secondary');
        $('.tabDiv').hide();
        $('#times').show();
        $('#footer').show();
        $('.fdate').show();
    });

    $(".menu-settings").click(function (e) {
        $('.menu-div').removeClass('bg-secondary');
        $('#menu-div-settings').addClass('bg-secondary');
        $('.tabDiv').hide();
        $('#basicSettings').show();
        $('#footer').show();
        $('.fdate').hide();
    });

    $(".menu-adhans-offsets").click(function (e) {
        $('.menu-div').removeClass('bg-secondary');
        $('#menu-div-adhans-offsets').addClass('bg-secondary');
        $('.tabDiv').hide();
        $('#adhanOffsetSettings').show();
        $('#footer').hide();
    });

    $("#calculationMethod").change(function () {
        chrome.storage.local.get(['appSettings'], function (result) {
            appSettings = result.appSettings;
            appSettings.calculationMethod = $('#calculationMethod').val();
            saveAppSettingsAndRefresh(appSettings);
        });
    });

    $("#desktopNotificationsToggle").click(function () {
        chrome.storage.local.get(['appSettings'], function (result) {
            appSettings = result.appSettings;
            appSettings.desktopNotifications = !appSettings.desktopNotifications;
            saveAppSettingsAndRefresh(appSettings);
            chrome.notifications.clear('test');
            if (appSettings.desktopNotifications) {
                chrome.notifications.create(
                    'test',
                    {
                        type: "image",
                        imageUrl: 'images/notification.jpg',
                        iconUrl: 'images/icons/128.png',
                        title: appSettings.i18n['desktopNotificationsOnTitle'],
                        message: appSettings.address
                    }
                );
                chrome.storage.local.set({ 'lastAlert': 'settingUpdate' });
            }
        });
    });

    $("#showImsakToggle").click(function () {
        chrome.storage.local.get(['appSettings'], function (result) {
            appSettings = result.appSettings;
            appSettings.showImsak = !appSettings.showImsak;
            saveAppSettingsAndRefresh(appSettings);
        });
    });

    $("#showDuhaToggle").click(function () {
        chrome.storage.local.get(['appSettings'], function (result) {
            appSettings = result.appSettings;
            appSettings.showDuha = !appSettings.showDuha;
            saveAppSettingsAndRefresh(appSettings);
        });
    });

    $("#showMidnightToggle").click(function () {
        chrome.storage.local.get(['appSettings'], function (result) {
            appSettings = result.appSettings;
            appSettings.showMidnight = !appSettings.showMidnight;
            saveAppSettingsAndRefresh(appSettings);
        });
    });

    $("#hour24Toggle").click(function () {
        chrome.storage.local.get(['appSettings'], function (result) {
            appSettings = result.appSettings;
            appSettings.timeFormat = (appSettings.timeFormat == 12) ? 24 : 12;
            saveAppSettingsAndRefresh(appSettings);
        });
    });

    $(".adhansToggle").click(function () {
        navigator.serviceWorker.controller.postMessage({ endAdhanCall: true });
        chrome.storage.local.get(['appSettings'], function (result) {
            appSettings = result.appSettings;
            appSettings.areAdhansEnabled = !appSettings.areAdhansEnabled;
            saveAppSettingsAndRefresh(appSettings);
            displayAdhansAndOffsets();
        });
    });

    $("#hanafiAsrToggle").click(function () {
        chrome.storage.local.get(['appSettings'], function (result) {
            appSettings = result.appSettings;
            appSettings.hanafiAsr = !appSettings.hanafiAsr;
            saveAppSettingsAndRefresh(appSettings);
        });
    });

    $(".iconButton").click(function (e) {
        chrome.storage.local.get(['appSettings'], function (result) {
            appSettings = result.appSettings;
            appSettings.iconStyle = e.currentTarget.value;
            saveAppSettingsAndRefresh(appSettings);
        });
    });

    $("#googleMapsButton").click(function (e) {
        window.open('https://maps.google.com/?q=' + appSettings.address)
    });

    $(".lastHourHilite").click(function (e) {
        chrome.storage.local.get(['appSettings'], function (result) {
            appSettings = result.appSettings;
            appSettings.lastHourHilite = ((appSettings.lastHourHilite ?? 0) + 1) % 2;
            saveAppSettingsAndRefresh(appSettings);
        });
    });

    $("#addressForm").submit(function (event) {

        event.preventDefault();
        showLoading();
        $('#addressButton').attr('disabled', true);

        chrome.storage.local.get(['appSettings'], function (result) {

            appSettings = result.appSettings;
            let ceCallURL = 'https://smartazanclock.com/geolocation?address=' + $('#address').val();

            fetch(ceCallURL, { method: 'POST' }).then((response) => {
                if (response.status == 200) {
                    response.json().then((data) => {
                        appSettings.address = data.address;
                        appSettings.lat = data.lat;
                        appSettings.lng = data.lng;
                        appSettings.timeZoneID = data.timeZoneID;
                        chrome.storage.local.set({ 'appSettings': appSettings }, () => {
                            goGoRun('address updated');
                            $('#addressButton').attr('disabled', false);
                            $('#loadingImg').attr('src', '/images/check.png');
                            $(':focus').blur();
                            hideLoadingOnSuccess();
                        });
                    });
                }
                else
                    addressSearchFail()

            }).catch((err) => { addressSearchFail() });

        });

    });

    $("#hijriDateIncrease").click(function (e) {
        saveHijriDateOffset('+');
    });

    $("#hijriDateDecrease").click(function (e) {
        saveHijriDateOffset('-');
    });

    $("#displayLanguage").change(function (e) {
        let code = e.target.value;
        let i18nValues = {};
        let lang = languages.some(f => f.code == code) ? code : 'en';
        fetch('_locales/' + lang + '/messages.json').then((response) => {
            response.json().then((data) => {
                Object.entries(data).forEach(([key, value]) => { i18nValues[key] = value.message });
                appSettings.i18n = i18nValues;
                saveAppSettingsAndRefresh(appSettings);
                displayAdhansAndOffsets();
            });
        });
    });

    $("#appResetButton").click(function (e) {
        document.getSelection().removeAllRanges();
        navigator.serviceWorker.controller.postMessage({ endAdhanCall: true });
        adhanStatus = {};
        showLoading();
        chrome.storage.local.clear();
        goGoRun('extension reset');
        setTimeout(() => {
            $("#menu-div-clock").trigger("click");
            hideLoadingOnSuccess();
        }, 2000);
    });

    $("#audioPlayerDiv").click(function (e) {
        stopAudio();
    });

    $("#stopAdhanDiv").click(() => {
        navigator.serviceWorker.controller.postMessage({ endAdhanCall: true });
    });

});

document.addEventListener('click', function (event) {

    if (event.target && event.target.classList.contains('playAudioButton')) {
        playAudio(appSettings.adhans[event.target.dataset.vakit]);
    }

    if (event.target && event.target.classList.contains('adhanRecitorBtn')) {
        let isVisible = $('#adhanRow' + event.target.dataset.name).is(':visible')
        $('.adhanRow').slideUp();
        if (!isVisible) {
            $('#adhanRow' + event.target.dataset.name).slideToggle();
        }
    }

    if (event.target && event.target.classList.contains('offsetIncrease')) {
        let vakit = event.target.dataset.vakit;
        saveOffset(vakit, '+');
    }

    if (event.target && event.target.classList.contains('offsetDecrease')) {
        let vakit = event.target.dataset.vakit;
        saveOffset(vakit, '-');
    }

});

document.getElementById('adhanOffsetSettings').addEventListener('change', function (event) {
    if (event.target && event.target.matches('select.adhanDD')) {
        chrome.storage.local.get(['appSettings'], function (result) {
            appSettings = result.appSettings;
            appSettings.adhans[event.target.dataset.name] = event.target.value * 1;
            saveAppSettingsAndRefresh(appSettings);
            if (event.target.value != 0) {
                $('#adhanRow' + event.target.dataset.name).removeClass('d-none');
            }
        });
    }
});

const saveAppSettingsAndRefresh = (appSettings) => {
    chrome.storage.local.set({ 'appSettings': appSettings }, function () {
        goGoRun('appSettings updated');
        $(':focus').blur();
    });
}

const setFields = async (appSettings) => {

    $('#stopAdhanDiv').hide();
    if (adhanStatus.isBeingCalled)
        $('#stopAdhanDiv').show();

    if (!$('#basicSettings').is(':visible'))
        $('#address').val(appSettings.address);

    let topAddressMaxLen = 13;
    let topAddress = appSettings.address.substring(0, topAddressMaxLen) + ((appSettings.address.length > topAddressMaxLen) ? '…' : '');
    $('#addressMenuText').html(topAddress);
    $('#appResetButton').text('Reset ' + 'V.' + chrome.runtime.getManifest().version);
    $('.timeNowTitle').html(appSettings.timeNow).attr('title', 'Current Time in ' + appSettings.timeZoneID);
    $('#calculationMethod').val(appSettings.calculationMethod);
    $('#fajrAngle').html(appSettings.i18n['fajrText'] + ' ' + appSettings.fajrAngle);
    $('#ishaAngle').html(appSettings.i18n['ishaText'] + ' ' + appSettings.ishaAngle);

    $('.iconButton').removeClass('btn-primary').addClass('btn-darkish');
    $('#' + appSettings.iconStyle.toLowerCase() + 'Button').removeClass('btn-darkish').addClass("btn-primary");

    $('#desktopNotificationsOn').hide();
    $('#desktopNotificationsOff').hide();
    if (appSettings.desktopNotifications)
        $('#desktopNotificationsOn').show();
    else
        $('#desktopNotificationsOff').show();

    $('.hanafiAsrOption').hide();
    if (appSettings.hanafiAsr)
        $('#hanafiAsrOn').show();
    else
        $('#hanafiAsrOff').show();

    $('.showImsakOption').hide();
    if (appSettings.showImsak) {
        $('#showImsakOn').show();
    }
    else {
        $('#showImsakOff').show();
    }

    $('.showDuhaOption').hide();
    if (appSettings.showDuha) {
        $('#showDuhaOn').show();
    }
    else {
        $('#showDuhaOff').show();
    }

    $('.showMidnightOption').hide();
    if (appSettings.showMidnight) {
        $('#showMidnightOn').show();
    }
    else {
        $('#showMidnightOff').show();

    }

    $('.hour24Option').hide();
    if (appSettings.timeFormat == 12) {
        $('#hour24Off').show();
    }
    else {
        $('#hour24On').show();
    }

    $('.lastHourHilite').hide();
    if (appSettings.isLastHour) {
        if (appSettings.lastHourHilite == 0) {
            $('#lastHourHiliteOff').show();
        }
        else {
            $('#lastHourHiliteOn').show();
        }
    }

    const dispLang = document.getElementById('displayLanguage');
    dispLang.innerHTML = '';
    languages.forEach(language => {
        const option = document.createElement('option');
        option.value = language.code;
        option.textContent = language.name;
        if (appSettings.i18n.languageCode == language.code)
            option.selected = true;
        dispLang.appendChild(option);
    });

    const calculationMethod = document.getElementById('calculationMethod');
    calculationMethod.innerHTML = '';
    methods.forEach(m => {
        const option = document.createElement('option');
        option.value = m.id;
        option.textContent = m.name;
        if (appSettings.calculationMethod == m.id)
            option.selected = true;
        calculationMethod.appendChild(option);
    });

    if (!$('#adhanOffsetSettings').is(':visible'))
        displayAdhansAndOffsets();

}

const displayAdhansAndOffsets = () => {
    $('.offsetCurrentVakit').removeClass('offsetCurrentVakit');
    let adhanVakits = ['imsak', 'fajr', 'duha', 'duhaend', 'dhuhr', 'asr', 'maghrib', 'isha'];
    let aoContent = `<div class="badge p-0 mt-0">${appSettings.i18n.adhansAndOffsetsTitle}</div>`;
    let offsetPresent = false;
    let imsakOffset = imsakDefaultOffset + (appSettings.vakitOffsets && appSettings.vakitOffsets.imsak ? appSettings.vakitOffsets.imsak : 0);
    let duhaOffset = duhaDefaultOffset + (appSettings.vakitOffsets && appSettings.vakitOffsets.duha ? appSettings.vakitOffsets.duha : 0);
    let duhaendOffset = duhaendDefaultOffset + (appSettings.vakitOffsets && appSettings.vakitOffsets.duhaend ? appSettings.vakitOffsets.duhaend : 0);
    let currentVakit = appSettings.allVakits.find(f => f.isCurrentVakit).name.toLowerCase();


    $('.adhan-on').hide();
    $('.adhan-off').hide();
    if (appSettings.areAdhansEnabled)
        $('.adhan-on').show();
    else
        $('.adhan-off').show();

    adhanVakits.forEach((v) => {
        let thisTime = appSettings.allVakits.find(f => f.name.toLowerCase() == v);
        let timeValue = thisTime.displayTime;
        let fajrAdhans = adhanAudios.filter(a => a.isFajrAdhan);
        let adhans = adhanAudios.filter(a => a.isAdhan);
        let thisAdhanAudioID = appSettings.adhans[v] ?? 0;
        let thisAudioTitle = adhanAudios.find(a => a.id == thisAdhanAudioID)?.name;
        aoContent += `<div id=settingBox${v} class="bg-darkish px-1
                    ${v == 'duha' ? 'rounded-top pt-2' : (v == 'duhaend' ? 'rounded-bottom pt-1 pb-2' : 'rounded py-2')}
                    ${v != 'duha' ? 'mb-1' : ''}
                    ${thisTime.isCurrentVakit || (v == 'duhaend' && currentVakit == 'duha') ? 'border-start border-3 border-light' : ''}">`;
        aoContent += `<div class="d-flex flex-row justify-content-between">`;

        aoContent += `<div class="col-4">`;
        if (v != 'duhaend')
            aoContent += `<span class="badge">${appSettings.i18n[v + 'Text']}</span>`;

        if (v == 'imsak')
            aoContent += `<img title="${appSettings.i18n.fajrText + imsakOffset}" class="img-fluid" src="/images/info.png">`

        if (v == 'duha')
            aoContent += `<img title="(${appSettings.i18n.sunriseText}+${duhaOffset}) - (${appSettings.i18n.dhuhrText}${duhaendOffset})" class="img-fluid" src="/images/info.png">`

        if (v == 'isha')
            aoContent += `<img title="${appSettings.i18n.midnightText} @ ${appSettings.allVakits[9].displayTime}" class="img-fluid" src="/images/info.png">`

        aoContent += '</div>';

        aoContent += `<div class="col-2"><span class="badge">${timeValue}</span></div>`

        /* offsets */

        let offsetValue = appSettings.vakitOffsets && appSettings.vakitOffsets[v] ? appSettings.vakitOffsets[v] : 0;
        if (offsetValue != 0)
            offsetPresent = true;
        let stdLimit = 90;
        if (v == 'duha')
            stdLimit = 45;

        let increaseDisabled = false;
        let decreaseDisabled = false;

        if (offsetValue >= stdLimit)
            increaseDisabled = true;

        if (offsetValue <= -stdLimit)
            decreaseDisabled = true;

        if (v == 'imsak' && offsetValue >= 0)
            increaseDisabled = true;

        if (v == 'duha' && offsetValue <= 0)
            decreaseDisabled = true;

        if (v == 'duhaend' && offsetValue >= 0)
            increaseDisabled = true;

        if (v == 'maghrib' && offsetValue <= 0)
            decreaseDisabled = true;


        aoContent += '<div class="col-5">';
        aoContent += `
                            <div class="d-flex flex-row gap-1 justify-content-center">
                                <div><button ${decreaseDisabled ? 'disabled' : ''} class="btn btn-dark btn-xs offsetDecrease" id="${v}OffsetDecrease"
                                        data-vakit="${v}">-</button></div>
                                <div>
                                    <span id="${v}Offset" class="badge ${offsetValue != 0 ? 'bg-danger text-light' : 'bg-light text-dark'}">${offsetValue}</span>
                                </div>
                                <div>
                                    <button ${increaseDisabled ? 'disabled' : ''} class="btn btn-dark btn-xs offsetIncrease" id="${v}OffsetIncrease"
                                        data-vakit="${v}">+</button>
                                </div>
                            </div>
            `;
        aoContent += '</div>';
        /* offsets, end */

        /* adhan settings */
        if (appSettings.adhans.hasOwnProperty(v)) {
            aoContent += `<div class="col-1">`;
            aoContent += `<img title='${thisAudioTitle}' class="${appSettings.areAdhansEnabled ? 'adhanRecitorBtn pointerOn' : ''} ms-1 img-fluid" data-name=${v} src="images/mic${appSettings.areAdhansEnabled ? '' : '-na'}.png"/>`;
            aoContent += `</div>`;
        }
        else {
            aoContent += `<div class="col-1"></div>`;
        }
        /* adhan settings, end */

        aoContent += '</div>';

        if (appSettings.adhans.hasOwnProperty(v)) {

            aoContent += `<div class="adhanRow" id="adhanRow${v}" style="display:none;">`
            aoContent += `<div class="d-flex flex-row gap-1 mt-2 px-1 justify-content-between align-items-center">`
            aoContent += `<div class="flex-fill">`
            aoContent += `<select class="form-control form-control-sm adhanDD" 
                                data-name="${v}">
                                `;
            if (v == 'fajr') {
                fajrAdhans.forEach(a => {
                    aoContent += `<option ${thisAdhanAudioID == a.id ? "selected" : ""} value=${a.id}>${a.name}</option>`
                })
            }
            else {
                adhans.forEach(a => {
                    aoContent += `<option ${thisAdhanAudioID == a.id ? "selected" : ""} value=${a.id}>${a.name}</option>`
                })
            }
            aoContent += "</select>";
            aoContent += "</div>";

            aoContent += `<div><img src="images/play.png" class="playAudioButton pointer p-1 rounded" data-vakit="${v}" data-title="${thisAudioTitle}" /></div>`;

            aoContent += '</div>';
            aoContent += '</div>';

        }

        aoContent += '</div>';

    });

    let hijriDateOffset = appSettings.hijriDateOffset ?? 0;

    $('#hijriDateOffset').html(hijriDateOffset);
    $('#hijriDateIncrease').attr("disabled", false);
    $('#hijriDateDecrease').attr("disabled", false);

    if (hijriDateOffset != 0) {
        $('#hijriDateOffset').removeClass('bg-light text-dark').addClass('bg-danger text-light');
        offsetPresent = true;
    }
    else {
        $('#hijriDateOffset').removeClass('bg-danger text-light').addClass('bg-light text-dark');
    }
    if (hijriDateOffset >= 2)
        $('#hijriDateIncrease').attr("disabled", true);

    if (hijriDateOffset <= -2)
        $('#hijriDateDecrease').attr("disabled", true);


    $('.offset-adjustments').hide();
    if (offsetPresent) {
        $('#offset-adjustments-red').show();
    }
    else {
        $('#offset-adjustments-blank').show();
    }
    if (offsetPresent) {
        $('#adhan-on').show();
    }
    else {
        $('#offset-adjustments-blank').show();
    }

    $('#adhanOffsetSettingsContent').html(aoContent);

}

const playAudio = (id) => {
    audioPlayer.src = '/adhans/' + id + '.mp3';
    $('.playAudioButton').attr('src', '/images/stop.png').addClass('bg-danger');
    audioPlayer.play();
    $('#audioPlayerDiv').show();
}

const stopAudio = () => {
    audioPlayer.pause();
    audioPlayer.currentTime = 0;
    $('.playAudioButton').attr('src', '/images/play.png').removeClass('bg-danger');
    $('#audioPlayerDiv').hide();
}

audioPlayer.onended = () => {
    stopAudio();
}

const saveOffset = (name, action) => {
    chrome.storage.local.get(['appSettings'], function (result) {

        appSettings = result.appSettings;

        if (!appSettings.vakitOffsets)
            appSettings.vakitOffsets = {};

        let cv = appSettings.vakitOffsets[name] ?? 0;

        if (action == '+')
            cv++;
        else
            cv--;
        appSettings.vakitOffsets[name] = cv;
        chrome.storage.local.set({ 'appSettings': appSettings }, function () {
            goGoRun('offset update');
            $(':focus').blur();
            displayAdhansAndOffsets();
        });

    });
}

const saveHijriDateOffset = (action) => {

    chrome.storage.local.get(['appSettings'], function (result) {

        appSettings = result.appSettings;

        if (!appSettings.hijriDateOffset)
            appSettings.hijriDateOffset = 0;

        let cv = appSettings.hijriDateOffset;

        if (action == '+')
            cv++;
        else
            cv--;

        appSettings.hijriDateOffset = cv;

        chrome.storage.local.set({ 'appSettings': appSettings }, function () {
            goGoRun('hijri date offset updated');
            $(':focus').blur();
            displayAdhansAndOffsets();
        });

    });

}

const addressSearchFail = () => {
    $('#addressButton').attr('disabled', false);
    $('#address').val(appSettings.address);
    $(':focus').blur();
    hideLoadingOnError();
}

const showLoading = () => {
    $('#loadingImg').attr('src', '/images/loading.png');
    $('#loading').show();
}

const hideLoadingOnSuccess = () => {
    $('#loadingImg').attr('src', '/images/check.png');
    setTimeout(() => { $('#loading').hide() }, 500);
}

const hideLoadingOnError = () => {
    $('#loadingImg').attr('src', '/images/x.png');
    setTimeout(() => { $('#loading').hide() }, 500);
}
