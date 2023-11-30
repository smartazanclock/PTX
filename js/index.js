var appSettings;

chrome.runtime.onMessage.addListener(() => { runApp() });

$(function () {
    populateCalculationMethods();
    goGoRun('running on index load');
    setInterval(goGoRun, 1000);
});

const goGoRun = (info) => {
    if (navigator.serviceWorker)
        navigator.serviceWorker.controller.postMessage({ 'msg': (info ?? '') })
}

const runApp = () => {

    chrome.storage.local.get(['appSettings'], function (result) {

        appSettings = result.appSettings;

        $('#clock').attr("src", appSettings.clock);
        $('.menu-clock').attr("src", appSettings.icon);
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

        Object.entries(appSettings.appVakits).forEach(function ([vakit, value]) {
            let vd = $('.' + vakit.toLowerCase() + 'Div');
            let timeValue = (appSettings.timeFormat == 12) ? value.time12 : value.time24;
            vd.html('<div class="pt-1 small">' + appSettings.i18n[value.name.toLowerCase() + 'Text'] + '</div>' + '<div class="p-1 vakitTime">' + timeValue + '</div>');
            let cClass = 'currentVakit bg-dark  border border-light rounded';
            vd.removeClass(cClass);
            if (value.isCurrentVakit == 1) {
                vd.addClass(cClass);
            }
        });

        setFields(appSettings);

    });
}

$(function () {

    /* event handlers */

    $(".menu-clock").click(function (e) {
        $('.menu-img').removeClass('bg-secondary');
        $('img.menu-clock').addClass('bg-secondary');
        $('.tabDiv').hide();
        $('#times').show();
        $('#footer').show();
        $('.menu-text').hide();
        $('#addressMenuText').show();
        $('.fdate').show();
    });

    $(".menu-settings").click(function (e) {
        $('.menu-img').removeClass('bg-secondary');
        $('img.menu-settings').addClass('bg-secondary');
        $('.tabDiv').hide();
        $('#basicSettings').show();
        $('#footer').show();
        $('.menu-text').hide();
        $('#settingsMenuText').show();
        $('.fdate').hide();
    });

    $(".menu-offsets").click(function (e) {
        $('.menu-img').removeClass('bg-secondary');
        $('img.menu-offsets').addClass('bg-secondary');
        $('.tabDiv').hide();
        $('#offsetAdjustments').show();
        $('#footer').hide();
        $('.menu-text').hide();
        $('#offsetsMenuText').show();
    });

    $("#calculationMethod").change(function () {
        setThenSaveAndRefresh('calculationMethod', $('#calculationMethod').val());
    });

    $("#desktopNotificationsToggle").click(function () {
        chrome.storage.local.get(['appSettings'], function (result) {
            appSettings = result.appSettings;
            appSettings.desktopNotifications = ((appSettings.desktopNotifications ?? 0) + 1) % 2;
            saveAppSettingsAndRefresh(appSettings);
            chrome.notifications.clear('test');
            if (appSettings.desktopNotifications == 1) {
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
            appSettings.showImsak = ((appSettings.showImsak ?? 0) + 1) % 2;
            saveAppSettingsAndRefresh(appSettings);
        });
    });

    $("#showMidnightToggle").click(function () {
        chrome.storage.local.get(['appSettings'], function (result) {
            appSettings = result.appSettings;
            appSettings.showMidnight = ((appSettings.showMidnight ?? 0) + 1) % 2;
            saveAppSettingsAndRefresh(appSettings);
        });
    });

    $("#hour24Toggle").click(function () {
        chrome.storage.local.get(['appSettings'], function (result) {
            appSettings = result.appSettings;
            appSettings.timeFormat = (appSettings.timeFormat == 12) ? '24' : '12';
            saveAppSettingsAndRefresh(appSettings);
        });
    });

    $("#hanafiAsrToggle").click(function () {
        chrome.storage.local.get(['appSettings'], function (result) {
            appSettings = result.appSettings;
            appSettings.hanafiAsr = ((appSettings.hanafiAsr ?? 0) + 1) % 2;
            saveAppSettingsAndRefresh(appSettings);
        });
    });

    $(".iconButton").click(function (e) {
        setThenSaveAndRefresh('iconStyle', e.currentTarget.value);
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

    $(".offsetIncrease").click(function (e) {
        let vakit = $(this).data('vakit');
        saveOffset(vakit, '+');
    });

    $(".offsetDecrease").click(function (e) {
        let vakit = $(this).data('vakit');
        saveOffset(vakit, '-');
    });

    $("#hijriDateIncrease").click(function (e) {
        saveHijriDateOffset('+');
    });

    $("#hijriDateDecrease").click(function (e) {
        saveHijriDateOffset('-');
    });

    $("#offsetsResetButton").click(function (e) {
        chrome.storage.local.get(['appSettings'], function (result) {
            appSettings = result.appSettings;
            appSettings.vakitOffsets = null;
            appSettings.hijriDateOffset = 0;
            chrome.storage.local.set({ 'appSettings': appSettings }, function () {
                goGoRun('offsets reset');
                $(':focus').blur();
            });
        });
    });

    $("#displayLanguage").change(function (e) {
        let code = e.target.value;
        let i18nValues = {};
        let lang = (availableLangs.indexOf(code) >= 0) ? code : 'en';
        fetch('_locales/' + lang + '/messages.json').then((response) => {
            response.json().then((data) => {
                Object.entries(data).forEach(([key, value]) => { i18nValues[key] = value.message });
                appSettings.i18n = i18nValues;
                saveAppSettingsAndRefresh(appSettings);
            });
        });
    });

    $("#appResetButton").click(function (e) {
        document.getSelection().removeAllRanges();
        showLoading();
        chrome.storage.local.clear();
        goGoRun('extension reset');
        $(".menu-clock").trigger("click");
        hideLoadingOnSuccess();
    });

});

const populateCalculationMethods = () => {
    Object.entries(calculationMethods).forEach(function ([key, value]) {
        $('#calculationMethod').append('<option value="' + key + '">' + value.name + '</option>');
    });
}

const setThenSaveAndRefresh = (name, value) => {
    chrome.storage.local.get(['appSettings'], function (result) {
        appSettings = result.appSettings;
        appSettings[name] = value;
        saveAppSettingsAndRefresh(appSettings);
    });
}

const saveAppSettingsAndRefresh = (appSettings) => {
    chrome.storage.local.set({ 'appSettings': appSettings }, function () {
        goGoRun('appSettings updated');
        $(':focus').blur();
    });
}

const justSaveAppSettings = (appSettings) => {
    chrome.storage.local.set({ 'appSettings': appSettings }, function () {
        $(':focus').blur();
    });
}

const setFields = (appSettings) => {

    if (!$('#basicSettings').is(':visible'))
        $('#address').val(appSettings.address);

    $('#displayLanguage').val(appSettings.i18n.languageCode);

    let topAddressMaxLen = 21;
    let topAddress = appSettings.address.substring(0, topAddressMaxLen) + ((appSettings.address.length > topAddressMaxLen) ? '…' : '');
    $('#addressMenuText').html(topAddress);

    $('#appResetButton').text('Reset App V.' + chrome.runtime.getManifest().version);
    $('#calculationMethod').val(appSettings.calculationMethod);
    $('#calculationMethodName').html(appSettings.calculationMethodName);
    $('#fajrAngle').html(appSettings.i18n['fajrText'] + ' ' + appSettings.fajrAngle);
    $('#ishaAngle').html(appSettings.i18n['ishaText'] + ' ' + appSettings.ishaAngle);
    $('#imsakOffset').html(0).removeClass('bg-danger text-light').addClass('bg-light text-dark');
    $('#fajrOffset').html(0).removeClass('bg-danger text-light').addClass('bg-light text-dark');
    $('#dhuhrOffset').html(0).removeClass('bg-danger text-light').addClass('bg-light text-dark');
    $('#asrOffset').html(0).removeClass('bg-danger text-light').addClass('bg-light text-dark');
    $('#maghribOffset').html(0).removeClass('bg-danger text-light').addClass('bg-light text-dark');
    $('#ishaOffset').html(0).removeClass('bg-danger text-light').addClass('bg-light text-dark');
    $('#imsakOffsetIncrease').attr("disabled", true);
    $('#maghribOffsetDecrease').attr("disabled", true);
    if (appSettings.calculationMethod == 'TurkiyeDiyanet' || appSettings.calculationMethod == 'EUDiyanet')
        $('#maghribOffsetDecrease').attr("disabled", false);

    let offsetPresent = false;
    if (appSettings.vakitOffsets) {
        Object.entries(appSettings.vakitOffsets).forEach(function (v) {

            let stdLimit = 90;
            if (v[0] == 'maghrib')
                stdLimit = 30;

            $('#' + v[0] + 'Offset').html(v[1]);
            if (v[1] != 0) {
                $('#' + v[0] + 'Offset').removeClass('bg-light text-dark').addClass('bg-danger text-light');
                offsetPresent = true;
            }

            $('#' + v[0] + 'OffsetIncrease').attr("disabled", false);
            $('#' + v[0] + 'OffsetDecrease').attr("disabled", false);

            if (v[1] >= stdLimit)
                $('#' + v[0] + 'OffsetIncrease').attr("disabled", true);

            if (v[1] <= -stdLimit)
                $('#' + v[0] + 'OffsetDecrease').attr("disabled", true);

            if (v[0] == 'imsak' && v[1] >= 0)
                $('#' + v[0] + 'OffsetIncrease').attr("disabled", true);

            if (v[0] == 'maghrib' && v[1] <= 0 && appSettings.calculationMethod != 'TurkiyeDiyanet' && appSettings.calculationMethod != 'EUDiyanet')
                $('#' + v[0] + 'OffsetDecrease').attr("disabled", true);

        });
    }

    $('#hijriDateOffset').html(0).removeClass('bg-danger text-light').addClass('bg-light text-dark');
    $('#hijriDateIncrease').attr("disabled", false);
    $('#hijriDateDecrease').attr("disabled", false);

    if (appSettings.hijriDateOffset) {

        $('#hijriDateOffset').html(appSettings.hijriDateOffset);

        if (appSettings.hijriDateOffset != 0) {
            $('#hijriDateOffset').removeClass('bg-light text-dark').addClass('bg-danger text-light');
            offsetPresent = true;
        }

        if (appSettings.hijriDateOffset >= 2)
            $('#hijriDateIncrease').attr("disabled", true);

        if (appSettings.hijriDateOffset <= -2)
            $('#hijriDateDecrease').attr("disabled", true);

    }

    $('.offset-adjustments').hide();

    if (offsetPresent) {
        $('#offset-adjustments-red').show();
        $('#offsetsResetButton').removeClass('btn-darkish').addClass('btn-danger');
    }

    else {
        $('#offset-adjustments-blank').show();
        $('#offsetsResetButton').removeClass('btn-danger').addClass('btn-darkish');
    }


    $('.iconButton').removeClass('btn-primary').addClass('btn-darkish');
    $('#' + appSettings.iconStyle.toLowerCase() + 'Button').removeClass('btn-darkish').addClass("btn-primary");

    $('#desktopNotificationsOn').hide();
    $('#desktopNotificationsOff').hide();
    if (appSettings.desktopNotifications == 1)
        $('#desktopNotificationsOn').show();
    else
        $('#desktopNotificationsOff').show();

    $('#hanafiAsrOn').hide();
    $('#hanafiAsrOff').hide();
    if (appSettings.hanafiAsr == 1)
        $('#hanafiAsrOn').show();
    else
        $('#hanafiAsrOff').show();

    $('#showImsakOn').hide();
    $('#showImsakOff').hide();
    $('.vakitDiv.imsakDiv').hide();
    $('#imsakOffsetDiv').hide();
    if (appSettings.showImsak == 1) {
        $('#showImsakOn').show();
        $('.vakitDiv.imsakDiv').show();
        $('#imsakOffsetDiv').show();
    }
    else {
        $('#showImsakOff').show();
    }

    $('#showMidnightOn').hide();
    $('#showMidnightOff').hide();
    $('.vakitDiv.midnightDiv').hide();
    if (appSettings.showMidnight == 1) {
        $('#showMidnightOn').show();
        $('.vakitDiv.midnightDiv').show();
    }
    else {
        $('#showMidnightOff').show();

    }

    $('.vakitDiv').removeClass('col-3').removeClass('col-4');
    if (appSettings.showImsak == 1 || appSettings.showMidnight == 1)
        $('.vakitDiv').addClass('col-3');
    else
        $('.vakitDiv').addClass('col-4');

    $('#hour24On').hide();
    $('#hour24Off').hide();
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
    $('#loadingImg').attr('src', '');
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

