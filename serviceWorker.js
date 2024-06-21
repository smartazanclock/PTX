self.importScripts('js/praytimes.js', 'js/functions.js');

chrome.runtime.onInstalled.addListener(async () => { await start() });
chrome.runtime.onStartup.addListener(async () => { await run('onStartUp') });
chrome.alarms.onAlarm.addListener(async (alarm) => { await run('via alarm:' + alarm.name + ' at ' + Date.now()) }); /* every minute */
self.addEventListener('message', async () => { await run('run via message') }); /* every second from index */

let appSettings = {};
const r = 160;
const ir = 12;
const colors = { black: '#212529', silver: 'whitesmoke', tomato: '#F20031', gray: '#2E3338' };
const ctx = new OffscreenCanvas(470, 470).getContext("2d", { alpha: true, willReadFrequently: true });
const itx = new OffscreenCanvas(38, 38).getContext("2d", { alpha: true, willReadFrequently: true });
const btx = new OffscreenCanvas(38, 38).getContext("2d", { alpha: true, willReadFrequently: true });

async function run(info) {
    let result = await chrome.storage.local.get(['appSettings']);
    if (!result.appSettings) {
        return start();
    }

    appSettings = result.appSettings;
    let lastRunMS = new Date().getTime() - (appSettings.lastRun ?? 0);
    if (lastRunMS < 700 && info && info.indexOf('alarm') > 0) { return }

    populateVakitsAndVars();

    clearCanvas(ctx);
    updateClock(ctx, r);

    clearCanvas(itx);
    updateIcon(itx, ir);

    clearCanvas(btx);
    updateBar(btx, ir);

    extensionOps();

}

async function start() {
    let i18nValues = {};
    let navLang = navigator.language;
    let lang = (availableLangs.indexOf(navLang) >= 0) ? navLang : 'en';

    let result = await chrome.storage.local.get(['appSettings']);
    if (result.appSettings && result.appSettings.i18n) {
        let lc = result.appSettings.i18n.languageCode;
        lang = (availableLangs.indexOf(lc) >= 0) ? lc : 'en';
    }

    const response = await fetch(`../_locales/${lang}/messages.json`);
    if (!response.ok) {
        throw new Error(`Failed to fetch language messages: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    Object.entries(data).forEach(([key, value]) => { i18nValues[key] = value.message });
    await initUser(i18nValues, result.appSettings);
}

async function initUser(i18nValues, appSettings) {

    try {

        if (appSettings && appSettings.address) {
            /* existing user: new version */
            appSettings.i18n = i18nValues;
            await chrome.storage.local.set({ 'appSettings': appSettings });
            await initAlarm();
        }
        else {
            /* new user: first installation */
            const response = await fetch('https://smartazanclock.com/iplocation', { method: 'POST' });
            if (!response.ok) {
                throw new Error(`Failed to fetch IP location: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            let appSettings = {
                i18n: i18nValues,
                ...data,
                timeFormat: 12,
                calculationMethod: i18nValues.defaultMethod,
                iconStyle: 'badge',
                desktopNotifications: 0,
                showImsak: 0,
                showDuha: 0,
                showMidnight: 0
            };
            await chrome.storage.local.set({ 'appSettings': appSettings });
        }

    } catch (error) {
        await initDefaultUser(i18nValues);
    }

    await initAlarm();

}

async function initDefaultUser(i18nValues) {
    let appSettings = { i18n: i18nValues };
    appSettings.address = "Al-Masjid An-Nabawi"; /* صلى الله عليه وعلى آله وسلم */
    appSettings.lat = 24.4672105;
    appSettings.lng = 39.611131;
    appSettings.timeZoneID = "Asia/Riyadh";
    appSettings.calculationMethod = 'Makkah';
    appSettings.iconStyle = 'badge';
    appSettings.desktopNotifications = 0;
    appSettings.showImsak = 0;
    appSettings.showDuha = 0;
    appSettings.showMidnight = 0;
    await chrome.storage.local.set({ 'appSettings': appSettings });
}

async function initAlarm() {
    run('onInstall');
    let w = new Date();
    w.setMinutes(w.getMinutes() + 1);
    w.setSeconds(0);
    w.setMilliseconds(0);
    await chrome.alarms.create('everyMinute', { periodInMinutes: 1, when: Date.parse(w) });
}

function clearCanvas(canvas) {
    canvas.save();
    canvas.translate(0, 0);
    canvas.clearRect(0, 0, canvas.canvas.width, canvas.canvas.height);
    canvas.restore();
    return this;
}

function populateVakitsAndVars() {

    /* get prayer times */
    prayTimes.setMethod(appSettings.calculationMethod);

    if (appSettings.hanafiAsr === 1)
        prayTimes.adjust({ asr: 'Hanafi' });
    else
        prayTimes.adjust({ asr: 'Standard' });


    let baseTuneValues = { imsak: 0, sunrise: 0, duha: 0, duhaend: 0, fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 }
    let methodDefaultTuneValues = calculationMethods[appSettings.calculationMethod].methodOffsets;
    tuneValues = { ...baseTuneValues, ...methodDefaultTuneValues }

    if (appSettings.vakitOffsets) {
        if (appSettings.vakitOffsets.imsak)
            tuneValues.imsak += appSettings.vakitOffsets.imsak;
        if (appSettings.vakitOffsets.fajr)
            tuneValues.fajr += appSettings.vakitOffsets.fajr;
        if (appSettings.vakitOffsets.duha)
            tuneValues.duha += appSettings.vakitOffsets.duha;
        if (appSettings.vakitOffsets.duhaend)
            tuneValues.duhaend += appSettings.vakitOffsets.duhaend;
        if (appSettings.vakitOffsets.dhuhr)
            tuneValues.dhuhr += appSettings.vakitOffsets.dhuhr;
        if (appSettings.vakitOffsets.asr)
            tuneValues.asr += appSettings.vakitOffsets.asr;
        if (appSettings.vakitOffsets.maghrib)
            tuneValues.maghrib += appSettings.vakitOffsets.maghrib;
        if (appSettings.vakitOffsets.isha)
            tuneValues.isha += appSettings.vakitOffsets.isha;
    }

    prayTimes.tune({ imsak: tuneValues.imsak, fajr: tuneValues.fajr, sunrise: tuneValues.sunrise, duha: tuneValues.duha, duhaend: tuneValues.duhaend, dhuhr: tuneValues.dhuhr, asr: tuneValues.asr, maghrib: tuneValues.maghrib, isha: tuneValues.isha });

    currentTime = new Date(new Date().toLocaleString("en-US", { timeZone: appSettings.timeZoneID }));
    currentTimeString = currentTime.getHours() + ':' + fillInZeros(currentTime.getMinutes());
    prayerTimes = prayTimes.getTimes(currentTime, [appSettings.lat, appSettings.lng, 0], getOffsetHoursFromTimeZone(appSettings.timeZoneID), 0, '24h');
    appSettings.calculationMethodName = prayTimes.getDefaults()[appSettings.calculationMethod].name;

    appSettings.timeNow = format12(currentTimeString);

    appSettings.fajrAngle = prayTimes.getDefaults()[appSettings.calculationMethod].params.fajr;
    if (appSettings.fajrAngle.toString().indexOf('min') < 0)
        appSettings.fajrAngle += '°';

    appSettings.ishaAngle = prayTimes.getDefaults()[appSettings.calculationMethod].params.isha;
    if (appSettings.ishaAngle.toString().indexOf('min') < 0)
        appSettings.ishaAngle += '°';

    hijriCurrentTime = new Date(currentTime);
    if (appSettings.hijriDateOffset)
        hijriCurrentTime = addDaysToDate(hijriCurrentTime, appSettings.hijriDateOffset);
    hijriDate = new Intl.DateTimeFormat((appSettings.i18n.languageCode ?? navigator.language), { calendar: 'islamic-umalqura', day: 'numeric', month: 'long', year: 'numeric' }).format(hijriCurrentTime);

    let aVakits = [];
    let vakits = [];

    imsakVakit = new Vakit('Imsak', getPrayerTime('imsak'), getPrayerTime('fajr'), currentTimeString);
    fajrVakit = new Vakit('Fajr', getPrayerTime('fajr'), getPrayerTime('sunrise'), currentTimeString);
    sunriseDuhaVakit = new Vakit('Sunrise', getPrayerTime('sunrise'), getPrayerTime('duha'), currentTimeString);
    sunriseDhuhrVakit = new Vakit('Sunrise', getPrayerTime('sunrise'), getPrayerTime('dhuhr'), currentTimeString);
    duhaVakit = new Vakit('Duha', getPrayerTime('duha'), getPrayerTime('duhaend'), currentTimeString);
    duhaendVakit = new Vakit('Duhaend', getPrayerTime('duhaend'), getPrayerTime('dhuhr'), currentTimeString);
    dhuhrVakit = new Vakit('Dhuhr', getPrayerTime('dhuhr'), getPrayerTime('asr'), currentTimeString);
    asrVakit = new Vakit('Asr', getPrayerTime('asr'), getPrayerTime('maghrib'), currentTimeString);
    maghribVakit = new Vakit('Maghrib', getPrayerTime('maghrib'), getPrayerTime('isha'), currentTimeString);
    ishaImsakVakit = new Vakit('Isha', getPrayerTime('isha'), getPrayerTime('imsak'), currentTimeString);
    ishaFajrVakit = new Vakit('Isha', getPrayerTime('isha'), getPrayerTime('fajr'), currentTimeString);
    ishaMidnightVakit = new Vakit('Isha', getPrayerTime('isha'), getPrayerTime('midnight'), currentTimeString);
    midnightFajrVakit = new Vakit('Midnight', getPrayerTime('midnight'), getPrayerTime('fajr'), currentTimeString);
    midnightImsakVakit = new Vakit('Midnight', getPrayerTime('midnight'), getPrayerTime('imsak'), currentTimeString);

    aVakits.push(imsakVakit);
    aVakits.push(fajrVakit);
    aVakits.push(sunriseDuhaVakit);
    aVakits.push(duhaVakit);
    aVakits.push(duhaendVakit);
    aVakits.push(dhuhrVakit);
    aVakits.push(asrVakit);
    aVakits.push(maghribVakit);
    aVakits.push(ishaMidnightVakit);
    aVakits.push(midnightImsakVakit);

    if (appSettings.showImsak === 1) {
        vakits.push(imsakVakit);
    }
    vakits.push(new Vakit('Fajr', getPrayerTime('fajr'), getPrayerTime('sunrise'), currentTimeString));
    if (appSettings.showDuha === 1) {
        vakits.push(sunriseDuhaVakit);
        vakits.push(duhaVakit);
        vakits.push(duhaendVakit);
    }
    else {
        vakits.push(sunriseDhuhrVakit);
    }
    vakits.push(dhuhrVakit);
    vakits.push(asrVakit);
    vakits.push(maghribVakit);

    if (appSettings.showMidnight === 1) {
        vakits.push(ishaMidnightVakit);
        if (appSettings.showImsak === 1)
            vakits.push(midnightImsakVakit);
        else
            vakits.push(midnightFajrVakit);
    }
    else {
        if (appSettings.showImsak === 1)
            vakits.push(ishaImsakVakit);
        else
            vakits.push(ishaFajrVakit);
    }

    cvi = vakits.findIndex(a => a.isCurrentVakit);
    currentVakit = vakits[cvi];
    nextVakit = vakits[(cvi + 1) % vakits.length];

    cavi = aVakits.findIndex(a => a.isCurrentVakit);
    currentAllVakit = aVakits[cavi];

    totalMinutesInVakit = diffMinutesBetweenTimes(currentVakit.time24, nextVakit.time24);
    aroundTheClock = totalMinutesInVakit >= 720;
    remainingMinutesInVakit = diffMinutesBetweenTimes(currentTimeString, nextVakit.time24);
    passedInVakit = totalMinutesInVakit - remainingMinutesInVakit;

    appSettings.isLastHour = false;

    if (remainingMinutesInVakit <= 60)
        appSettings.isLastHour = true;

    appSettings.lastHourHilite = appSettings.lastHourHilite ?? 1;

    if (appSettings.isLastHour && appSettings.lastHourHilite == 1) {
        iconColor = colors.tomato;
        badgeBackgroundColor = colors.tomato;
        iconTextColor = colors.silver;
    }
    else {
        iconColor = colors.silver;
        badgeBackgroundColor = colors.gray;
        iconTextColor = colors.gray;
    }

    clockFaceVakit = appSettings.i18n[currentVakit.name.toLowerCase() + 'Text'];
    if (currentVakit.name === "Duhaend")
        clockFaceVakit = "";
    if (currentVakit.name === "Sunrise" && currentAllVakit.name !== "Sunrise")
        clockFaceVakit = "";
    if (currentVakit.name === "Midnight")
        clockFaceVakit = appSettings.i18n['ishaText'];

    if (appSettings.i18n.languageCode == "en" && clockFaceVakit)
        clockFaceVakit = clockFaceVakit.toUpperCase();

    let appVakits = [];
    for (let i = 0; i < vakits.length; i++) {
        appVakits.push(vakits[i]);
    }

    let allVakits = [];
    for (let i = 0; i < aVakits.length; i++) {
        allVakits.push(aVakits[i]);
    }

    appSettings.isJumua = false;
    if (currentTime.getDay() === 5)
        appSettings.isJumua = true;
    appSettings.appVakits = appVakits;
    appSettings.allVakits = allVakits;

    return this;
}

function updateIcon(canvas, r) {
    canvas.save();
    canvas.translate(canvas.canvas.width * 0.5, canvas.canvas.height * 0.5);
    fillCircle(canvas, r * 1.5, 0, 0, iconColor);

    if (aroundTheClock) {
        drawArc(canvas, 0, 2 * Math.PI + Math.PI / 40, r * 1.05, r / 3, iconTextColor);
        drawHand(canvas, nextVakit.startAngle12, r * 0.9, r * 1.13, r / 4, iconColor);
    }
    else {
        drawArc(canvas, currentVakit.startAngle12, currentVakit.endAngle12, r * 1.05, r / 3, iconTextColor);
    }

    drawArrow(canvas, hoursToRadians(hours12(currentTime.getHours()) * 60 + currentTime.getMinutes()), 0, r * 0.21, r * 0.81, iconTextColor);
    fillCircle(canvas, r * 0.19, 0, 0, iconTextColor);
    canvas.restore();
    return this;
}

function updateClock(canvas, r) {
    canvas.save();
    let arcLineWidth = r / 15;
    canvas.translate(canvas.canvas.width * 0.5, canvas.canvas.height * 0.5);

    /*
    if (currentVakit.name == 'Sunrise' || currentVakit.name == 'Duha' || currentVakit.name == 'Duhaend') {
        drawArc(canvas, sunriseDhuhrVakit.startAngle12, sunriseDhuhrVakit.endAngle12, r * 1.19, arcLineWidth, colors.gray);
    }
    */

    if (aroundTheClock) {
        drawArc(canvas, 0, 2 * Math.PI + Math.PI / 40, r * 1.19, arcLineWidth, colors.silver);
        drawHand(canvas, nextVakit.startAngle12, r * 1.15, r * 1.22, arcLineWidth / 1.7, colors.gray);
    }
    else {
        drawArc(canvas, currentVakit.startAngle12, currentVakit.endAngle12, r * 1.19, arcLineWidth, colors.silver);
    }

    if (currentVakit.name === 'Isha' || currentVakit.name === 'Midnight') {

        if (appSettings.showImsak === 0)
            drawArc(canvas, ishaFajrVakit.startAngle12, ishaFajrVakit.endAngle12, r * 1.19, arcLineWidth, colors.silver);
        else
            drawArc(canvas, ishaImsakVakit.startAngle12, ishaImsakVakit.endAngle12, r * 1.19, arcLineWidth, colors.silver);

        let fractionTextSize = r * 0.13;
        let totalMinutesInIsha = diffMinutesBetweenTimes(getPrayerTime('maghrib'), getPrayerTime('fajr'));
        let oneThird = totalMinutesInIsha / 3;
        let twoThird = oneThird * 2;

        let midnightRadians = timeToRadians(getPrayerTime('midnight'), 12);
        drawHand(canvas, midnightRadians, r * 1.15, r * 1.22, arcLineWidth / 1.7, colors.gray);
        printAt(canvas, '1/2', fractionTextSize, colors.silver, r, midnightRadians);

        let oneThirdRadians = timeToRadians(getPrayerTime('maghrib'), 12) + oneThird * 2 * Math.PI / 720;
        drawHand(canvas, oneThirdRadians, r * 1.15, r * 1.22, arcLineWidth / 1.7, colors.gray);
        printAt(canvas, '1/3', fractionTextSize, colors.silver, r, oneThirdRadians);

        let twoThirdRadians = timeToRadians(getPrayerTime('maghrib'), 12) + twoThird * 2 * Math.PI / 720;
        drawHand(canvas, twoThirdRadians, r * 1.15, r * 1.22, arcLineWidth / 1.7, colors.gray);
        printAt(canvas, '2/3', fractionTextSize, colors.silver, r, twoThirdRadians);

    }

    let hourRadians = hoursToRadians(hours12(currentTime.getHours()) * 60 + currentTime.getMinutes());
    let minuteRadians = minutesToRadians(currentTime.getMinutes());
    let secondRadians = secondsToRadians(currentTime.getSeconds());

    drawHand(canvas, hourRadians, -r * 0.05, r * 0.7, arcLineWidth, colors.silver);
    drawHand(canvas, minuteRadians, -r * 0.05, r * 1.05, arcLineWidth, colors.silver);
    drawHand(canvas, secondRadians, -r * 0.1, r * 1.1, arcLineWidth / 4, colors.silver);

    fillCircle(canvas, r * 0.02, 0, 0, colors.gray);
    drawNumbers12(canvas, r * 1.01, colors.silver);

    if (clockFaceVakit) {

        let topHands = handOnTop(hourRadians) || handOnTop(minuteRadians);
        let bottomHands = handOnBottom(hourRadians) || handOnBottom(minuteRadians);

        if (topHands && !bottomHands)
            print(canvas, clockFaceVakit, 27, colors.silver, r * 0.5);
        else
            print(canvas, clockFaceVakit, 27, colors.silver, -r * 0.5);

    }

    canvas.restore();

    return this;
}

function updateBar(canvas, r) {

    let barColor = iconColor;

    if (appSettings.isLastHour && appSettings.lastHourHilite == 1) {
        barColor = colors.tomato;
    }

    let iWidth = 38;
    let iHeight = 16;
    let borderPadding = 1.8;
    let actualWidth = iWidth - 2 * borderPadding;
    let actualHeight = iHeight - 2 * borderPadding;

    let remainingWidth = remainingMinutesInVakit * (actualWidth - 2 * borderPadding) / totalMinutesInVakit;

    if (remainingWidth < 4)
        remainingWidth = 4;

    canvas.save();
    canvas.beginPath();
    canvas.rect(0, 0, iWidth, iHeight);
    canvas.fillStyle = colors.silver;
    canvas.fill();
    canvas.restore();

    canvas.save();
    canvas.beginPath();
    canvas.rect(borderPadding, borderPadding, actualWidth, actualHeight);
    canvas.fillStyle = colors.gray;

    canvas.fill();
    canvas.restore();

    canvas.save();
    canvas.beginPath();
    canvas.rect(borderPadding * 2, borderPadding * 2, remainingWidth, actualHeight - 2 * borderPadding);
    canvas.fillStyle = barColor;
    canvas.fill();
    canvas.restore();

    canvas.save();
    canvas.translate(canvas.canvas.width * 0.5, canvas.canvas.height * 0.5);
    print(canvas, currentVakit.nextVakitIn, r * 1.1, colors.silver, r * 0.85);
    canvas.restore();
    return this;
}

function extensionOps() {

    let isRamadan = false;
    let enHijriDate = new Intl.DateTimeFormat('en', { calendar: 'islamic-umalqura', day: 'numeric', month: 'long', year: 'numeric' }).format(hijriCurrentTime);
    if (enHijriDate.indexOf('Ramadan') >= 0)
        isRamadan = true;

    let elapsedText = appSettings.i18n.elapsedTimeTitle + ' ' + diffBetweenTimes(currentVakit.time24, currentTimeString);

    let nextText = currentVakit.nextVakitIn;
    let nextTextTitle = appSettings.i18n.nextTextTitle;

    if (isRamadan && currentVakit.name === 'Asr')
        nextTextTitle = appSettings.i18n.remainingForIftarTitle;


    appSettings.iconColor = iconColor;
    appSettings.iconTextColor = iconTextColor;
    appSettings.todaysDate = new Date().toLocaleString((appSettings.i18n.languageCode ?? navigator.language), { timeZone: appSettings.timeZoneID, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    appSettings.todaysDateArabic = hijriDate;

    if (currentTimeString === currentVakit.time24 && appSettings.desktopNotifications === 1) {

        chrome.storage.local.get(['lastAlert'], (result) => {

            let lastAlertString = currentVakit.name + (new Date().toLocaleString("en-US", { day: 'numeric', month: 'numeric', year: 'numeric' })).replaceAll('/', '-');

            if (result.lastAlert && result.lastAlert === lastAlertString) {
                /* already alerted for this vakit */

            }
            else {
                chrome.storage.local.set({ 'lastAlert': lastAlertString });
                chrome.notifications.clear('notification');
                chrome.notifications.create(
                    'notification',
                    {
                        type: "image",
                        imageUrl: 'images/notification.jpg',
                        iconUrl: 'images/icons/128.png',
                        title: nextText,
                        message: appSettings.address
                    }
                );
            }

        });
    }

    chrome.action.setTitle({ title: (clockFaceVakit ? '[' + clockFaceVakit + '] ' : '') + nextTextTitle + ' ' + nextText + ' -> ' + appSettings.i18n[nextVakit.name.toLowerCase() + 'Text'] });

    if (currentTimeString === currentVakit.time24) {
        nextTextTitle = appSettings.i18n.azanTimeTitle;
        if (currentVakit.name === 'Imsak' || currentVakit.name === 'Sunrise' || currentVakit.name === 'Duha' || currentVakit.name === 'Duhaend' || currentVakit.name === 'Midnight')
            nextTextTitle = '&nbsp;';
        if (currentVakit.name !== 'Duhaend') {
            nextText = appSettings.i18n[currentVakit.name.toLowerCase() + 'Text'];
            chrome.action.setTitle({ title: nextText });
        }
    }

    if (nextText.length < 4)
        nextText = ' ' + nextText + ' ';




    chrome.action.setBadgeText({ 'text': '' });

    if (appSettings.iconStyle === "badge") {
        chrome.action.setBadgeText({ 'text': nextText });
        chrome.action.setBadgeBackgroundColor({ 'color': badgeBackgroundColor });
        chrome.action.setIcon({ imageData: { "38": btx.getImageData(0, 0, 38, 38) } });
    }
    else {
        chrome.action.setIcon({ imageData: { "38": itx.getImageData(0, 0, 38, 38) } });
    }

    appSettings.nextText = nextText;
    appSettings.nextTextTitle = nextTextTitle;

    appSettings.elapsedText = elapsedText;

    appSettings.iconStyle = appSettings.iconStyle ?? "badge";

    appSettings.remainingForIftar = null;
    if (isRamadan && currentVakit.name !== 'Asr' && currentVakit.name !== 'Maghrib' && currentVakit.name !== 'Isha' && currentVakit.name !== 'Midnight')
        appSettings.remainingForIftar = appSettings.i18n.remainingForIftarTitle + ' ' + diffBetweenTimes(currentTimeString, getPrayerTime('maghrib'));

    itx.canvas.convertToBlob().then((blob) => {
        let reader1 = new FileReader();
        reader1.readAsDataURL(blob);
        reader1.onloadend = () => {

            appSettings.icon = reader1.result;

            btx.canvas.convertToBlob().then((blob) => {
                let reader2 = new FileReader();
                reader2.readAsDataURL(blob);
                reader2.onloadend = () => {
                    appSettings.bar = reader2.result;
                    ctx.canvas.convertToBlob().then((blob) => {
                        let reader3 = new FileReader();
                        reader3.readAsDataURL(blob);
                        reader3.onloadend = () => {

                            appSettings.clock = reader3.result;
                            appSettings.lastRun = new Date().getTime();

                            chrome.storage.local.set({ 'appSettings': appSettings }, function () {
                                chrome.runtime.sendMessage({ msg: "runApp" }, function (response) {
                                    if (!chrome.runtime.lastError) {
                                        /* msg is received */
                                    }
                                    else {
                                        /* popup not open to receive the msg */
                                    }
                                });
                            });
                        }
                    });
                }
            });

        }
    });

    return true;

}

function getPrayerTime(vakit) { return prayerTimes[vakit].replace(/^0/, ''); }

function print(canvas, text, size, color, y) {
    canvas.save();
    if (!y)
        y = 0;
    canvas.font = 'bold ' + Math.floor(size) + 'px Arial';
    canvas.fillStyle = color;
    canvas.textBaseline = "middle";
    canvas.textAlign = 'center';
    canvas.fillText(text, 0, y);
    canvas.restore();
}

function printAt(canvas, text, size, color, r, angle) {
    canvas.save();
    canvas.textBaseline = "middle";
    canvas.fillStyle = color;
    canvas.textAlign = "center";
    canvas.font = size + "px Arial";
    let ang = angle - Math.PI / 2;
    canvas.rotate(ang);
    canvas.translate(0, r);
    canvas.rotate(-ang);
    canvas.fillText(text, 0, 0);
    canvas.restore();

}

function drawArc(canvas, startAngle, endAngle, radius, lineWidth, color) {
    canvas.save();
    canvas.beginPath();
    canvas.arc(0, 0, radius, startAngle, endAngle, false);
    canvas.lineWidth = lineWidth;
    canvas.lineCap = "butt";
    canvas.strokeStyle = color;
    canvas.stroke();
    canvas.restore();
}

function drawNumbers12(canvas, r, color) {
    let p;
    for (let n = 0; n < 12; n++) {
        canvas.save();
        canvas.textBaseline = "middle";
        canvas.fillStyle = color;
        canvas.textAlign = "center";
        canvas.font = "bold " + r * 0.15 + "px Arial";
        let ang = n * Math.PI / 6 - Math.PI;
        canvas.rotate(ang);
        canvas.translate(0, r * 1.35);
        canvas.rotate(-ang);
        p = n;
        if (n === 0)
            p = 12;
        canvas.fillText(p, 0, 0);
        canvas.restore();
    }
    for (let m = 0; m < 144; m++) {
        canvas.save();
        canvas.textBaseline = "middle";
        canvas.fillStyle = color;
        canvas.textAlign = "center";
        let ang = m * Math.PI / 30;
        canvas.rotate(ang);
        canvas.translate(0, r * 1.29);
        if (m % 5 !== 0) {
            canvas.font = r * 0.19 + "px Arial";
            canvas.fillText(".", 0, 0);
        }
        canvas.restore();
    }
}

function fillCircle(canvas, r, x, y, color) {
    canvas.save();
    canvas.beginPath();
    canvas.arc(x, y, r, 0, Math.PI * 2);
    canvas.fillStyle = color;
    canvas.fill();
    canvas.restore();
}

function drawHand(canvas, angle, from, to, lineWidth, color) {
    canvas.save();
    canvas.beginPath();
    canvas.rotate(angle);
    canvas.moveTo(from, 0);
    canvas.lineTo(to, 0);
    canvas.lineWidth = lineWidth;
    canvas.strokeStyle = color;
    canvas.lineCap = "round";
    canvas.stroke();
    canvas.restore();
}

function drawArrow(canvas, angle, x, width, height, color) {
    canvas.save();
    canvas.beginPath();
    canvas.rotate(angle);
    canvas.moveTo(x, -width);
    canvas.lineTo(x, width);
    canvas.lineTo(x + height, 0);
    canvas.fillStyle = color;
    canvas.fill();
    canvas.restore();
}

