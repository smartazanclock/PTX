self.importScripts('js/praytimes.js', 'js/functions.js');

chrome.runtime.onInstalled.addListener(() => { UserInitiation.start() });
chrome.runtime.onStartup.addListener(() => { goRun('onStartUp') });
chrome.alarms.onAlarm.addListener((alarm) => { goRun('via alarm:' + alarm.name + ' at ' + Date.now()) }); /* every minute */
self.addEventListener('message', () => { goRun('goRun via message') }); /* every second from index */

const UserInitiation = {
    start() {
        let i18nValues = {};
        let navLang = navigator.language;
        let lang = (availableLangs.indexOf(navLang) >= 0) ? navLang : 'en';
        chrome.storage.local.get(['appSettings'], (result) => {
            if (result.appSettings && result.appSettings.i18n) {
                let lc = result.appSettings.i18n.languageCode;
                lang = (availableLangs.indexOf(lc) >= 0) ? lc : 'en';
            }
            fetch('../_locales/' + lang + '/messages.json').then((response) => {
                response.json().then((data) => {
                    Object.entries(data).forEach(([key, value]) => { i18nValues[key] = value.message });
                    this.initUser(i18nValues, result.appSettings);
                });
            });
        });
    },
    initUser(i18nValues, appSettings) {

        if (appSettings && appSettings.address) {
            /* existing user: new version */
            appSettings.i18n = i18nValues;
            chrome.storage.local.set({ 'appSettings': appSettings }, () => {
                this.initAlarm();
            });
        }
        else {
            /* new user: first installation */
            fetch('https://smartazanclock.com/iplocation', { method: 'POST' }).then((response) => {
                if (response.status === 200) {
                    response.json().then((data) => {
                        let appSettings = { i18n: i18nValues };
                        appSettings.address = data.address;
                        appSettings.lat = data.lat;
                        appSettings.lng = data.lng;
                        appSettings.timeZoneID = data.timeZoneID;
                        appSettings.calculationMethod = appSettings.i18n.defaultMethod;
                        appSettings.iconStyle = 'badge';
                        appSettings.desktopNotifications = 0;
                        appSettings.showImsak = 0;
                        appSettings.showMidnight = 0;
                        chrome.storage.local.set({ 'appSettings': appSettings }, () => {
                            this.initAlarm();
                        });
                    });
                }
                else
                    this.initDefaultUser(i18nValues);

            }).catch((err) => { this.initDefaultUser(i18nValues); });

        }

    },
    initDefaultUser(i18nValues) {
        let appSettings = { i18n: i18nValues };
        appSettings.address = "Al-Masjid An-Nabawi"; /* صلى الله عليه وعلى آله وسلم */
        appSettings.lat = 24.4672105;
        appSettings.lng = 39.611131;
        appSettings.timeZoneID = "Asia/Riyadh";
        appSettings.calculationMethod = 'Makkah';
        appSettings.iconStyle = 'badge';
        appSettings.highLatsMethod = 'None';
        appSettings.desktopNotifications = 0;
        appSettings.showImsak = 0;
        appSettings.showMidnight = 0;
        chrome.storage.local.set({ 'appSettings': appSettings }, () => { this.initAlarm() });
    },
    initAlarm() {
        goRun('onInstall');
        let w = new Date();
        w.setMinutes(w.getMinutes() + 1);
        w.setSeconds(0);
        w.setMilliseconds(0);
        chrome.alarms.create('everyMinute', { periodInMinutes: 1, when: Date.parse(w) });
    }
};

const SmartAzanClock = {
    appSettings: {},
    colors: { black: 'black', silver: 'whitesmoke', tomato: '#F20031', gray: '#2E3338' },
    ctx: new OffscreenCanvas(470, 470).getContext("2d", { alpha: true, willReadFrequently: true }),
    itx: new OffscreenCanvas(38, 38).getContext("2d", { alpha: true, willReadFrequently: true }),
    btx: new OffscreenCanvas(38, 38).getContext("2d", { alpha: true, willReadFrequently: true }),
    clearCanvas(canvas) {
        canvas.save();
        canvas.translate(0, 0);
        canvas.clearRect(0, 0, canvas.canvas.width, canvas.canvas.height);
        canvas.restore();
        return this;
    },
    r: 160,
    ir: 12,
    run(info) {
        chrome.storage.local.get(['appSettings'], (result) => {
            if (result.appSettings) {
                this.appSettings = result.appSettings;
                let lastRunMS = new Date().getTime() - (this.appSettings.lastRun ?? 0);
                if (lastRunMS < 700 && info && info.indexOf('alarm') > 0) { return true; }
                this.populateVakitsAndVars()
                    .clearCanvas(this.ctx)
                    .updateClock(this.ctx, this.r)
                    .clearCanvas(this.itx)
                    .updateIcon(this.itx, this.ir)
                    .clearCanvas(this.btx)
                    .updateBar(this.btx, this.ir)
                    .extensionOps()
            }
            else
                UserInitiation.start();
        });
    },
    populateVakitsAndVars() {

        /* get prayer times */
        prayTimes.setMethod(this.appSettings.calculationMethod);


        if (this.appSettings.hanafiAsr === 1)
            prayTimes.adjust({ asr: 'Hanafi' });
        else
            prayTimes.adjust({ asr: 'Standard' });


        let baseTuneValues = { imsak: 0, sunrise: 0, fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 }
        let methodDefaultTuneValues = calculationMethods[this.appSettings.calculationMethod].methodOffsets;
        this.tuneValues = { ...baseTuneValues, ...methodDefaultTuneValues }

        if (this.appSettings.vakitOffsets) {
            if (this.appSettings.vakitOffsets.imsak)
                this.tuneValues.imsak += this.appSettings.vakitOffsets.imsak;
            if (this.appSettings.vakitOffsets.fajr)
                this.tuneValues.fajr += this.appSettings.vakitOffsets.fajr;
            if (this.appSettings.vakitOffsets.dhuhr)
                this.tuneValues.dhuhr += this.appSettings.vakitOffsets.dhuhr;
            if (this.appSettings.vakitOffsets.asr)
                this.tuneValues.asr += this.appSettings.vakitOffsets.asr;
            if (this.appSettings.vakitOffsets.maghrib)
                this.tuneValues.maghrib += this.appSettings.vakitOffsets.maghrib;
            if (this.appSettings.vakitOffsets.isha)
                this.tuneValues.isha += this.appSettings.vakitOffsets.isha;
        }

        prayTimes.tune({ imsak: this.tuneValues.imsak, fajr: this.tuneValues.fajr, sunrise: this.tuneValues.sunrise, dhuhr: this.tuneValues.dhuhr, asr: this.tuneValues.asr, maghrib: this.tuneValues.maghrib, isha: this.tuneValues.isha });

        this.currentTime = new Date(new Date().toLocaleString("en-US", { timeZone: this.appSettings.timeZoneID }));
        this.currentTimeString = this.currentTime.getHours() + ':' + fillInZeros(this.currentTime.getMinutes());
        this.prayerTimes = prayTimes.getTimes(this.currentTime, [this.appSettings.lat, this.appSettings.lng, 0], getOffsetHoursFromTimeZone(this.appSettings.timeZoneID), 0, '24h');
        this.appSettings.calculationMethodName = prayTimes.getDefaults()[this.appSettings.calculationMethod].name;

        this.appSettings.fajrAngle = prayTimes.getDefaults()[this.appSettings.calculationMethod].params.fajr;
        if (this.appSettings.fajrAngle.toString().indexOf('min') < 0)
            this.appSettings.fajrAngle += '°';

        this.appSettings.ishaAngle = prayTimes.getDefaults()[this.appSettings.calculationMethod].params.isha;
        if (this.appSettings.ishaAngle.toString().indexOf('min') < 0)
            this.appSettings.ishaAngle += '°';

        this.hijriCurrentTime = new Date(this.currentTime);
        if (this.appSettings.hijriDateOffset)
            this.hijriCurrentTime = addDaysToDate(this.hijriCurrentTime, this.appSettings.hijriDateOffset);
        this.hijriDate = new Intl.DateTimeFormat((this.appSettings.i18n.languageCode ?? navigator.language), { calendar: 'islamic-umalqura', day: 'numeric', month: 'long', year: 'numeric' }).format(this.hijriCurrentTime);

        let vakits = [];
        let vakitCounter = 0;

        if (this.appSettings.showImsak === 1)
            vakits.push(new Vakit(vakitCounter, ++vakitCounter, 'Imsak', this.getPrayerTime('imsak'), this.getPrayerTime('fajr'), this.currentTimeString));

        vakits.push(new Vakit(vakitCounter, ++vakitCounter, 'Fajr', this.getPrayerTime('fajr'), this.getPrayerTime('sunrise'), this.currentTimeString));
        vakits.push(new Vakit(vakitCounter, ++vakitCounter, 'Sunrise', this.getPrayerTime('sunrise'), this.getPrayerTime('dhuhr'), this.currentTimeString));
        vakits.push(new Vakit(vakitCounter, ++vakitCounter, 'Dhuhr', this.getPrayerTime('dhuhr'), this.getPrayerTime('asr'), this.currentTimeString));
        vakits.push(new Vakit(vakitCounter, ++vakitCounter, 'Asr', this.getPrayerTime('asr'), this.getPrayerTime('maghrib'), this.currentTimeString));
        vakits.push(new Vakit(vakitCounter, ++vakitCounter, 'Maghrib', this.getPrayerTime('maghrib'), this.getPrayerTime('isha'), this.currentTimeString));

        if (this.appSettings.showMidnight === 1) {

            vakits.push(new Vakit(vakitCounter, ++vakitCounter, 'Isha', this.getPrayerTime('isha'), this.getPrayerTime('midnight'), this.currentTimeString));

            if (this.appSettings.showImsak === 1)
                vakits.push(new Vakit(vakitCounter, 0, 'Midnight', this.getPrayerTime('midnight'), this.getPrayerTime('imsak'), this.currentTimeString));
            else
                vakits.push(new Vakit(vakitCounter, 0, 'Midnight', this.getPrayerTime('midnight'), this.getPrayerTime('fajr'), this.currentTimeString));

        }
        else {

            if (this.appSettings.showImsak === 1)
                vakits.push(new Vakit(vakitCounter, 0, 'Isha', this.getPrayerTime('isha'), this.getPrayerTime('imsak'), this.currentTimeString));
            else
                vakits.push(new Vakit(vakitCounter, 0, 'Isha', this.getPrayerTime('isha'), this.getPrayerTime('fajr'), this.currentTimeString));
        }

        this.currentVakit = vakits.filter(a => a.isCurrentVakit())[0];
        this.nextVakit = vakits.filter(a => a.index === this.currentVakit.nextIndex)[0];

        this.totalMinutesInVakit = diffMinutesBetweenTimes(this.currentVakit.time, this.nextVakit.time);
        this.aroundTheClock = this.totalMinutesInVakit >= 720;
        this.remainingMinutesInVakit = diffMinutesBetweenTimes(this.currentTimeString, this.nextVakit.time);
        this.passedInVakit = this.totalMinutesInVakit - this.remainingMinutesInVakit;

        this.appSettings.isLastHour = false;

        if (this.remainingMinutesInVakit <= 60)
            this.appSettings.isLastHour = true;

        this.appSettings.lastHourHilite = this.appSettings.lastHourHilite ?? 1;

        if (this.appSettings.isLastHour && this.appSettings.lastHourHilite == 1) {
            this.iconColor = this.colors.tomato;
            this.badgeBackgroundColor = this.colors.tomato;
            this.iconTextColor = this.colors.silver;
        }
        else {
            this.iconColor = this.colors.silver;
            this.badgeBackgroundColor = this.colors.gray;
            this.iconTextColor = this.colors.gray;
        }

        this.clockFaceVakit = this.appSettings.i18n[this.currentVakit.name.toLowerCase() + 'Text'];
        if (this.currentVakit.name === "Dhuhr" && this.currentTime.getDay() === 5)
            this.clockFaceVakit = this.appSettings.i18n['jumuaText'];
        if (this.currentVakit.name === "Sunrise")
            this.clockFaceVakit = "";
        if (this.currentVakit.name === "Midnight")
            this.clockFaceVakit = this.appSettings.i18n['ishaText'];

        if (this.appSettings.i18n.languageCode == "en")
            this.clockFaceVakit = this.clockFaceVakit.toUpperCase();


        let appVakits = {};

        for (let i = 0; i < vakits.length; i++) {
            appVakits[vakits[i].name] = {
                "name": (this.currentTime.getDay() === 5 && vakits[i].name === 'Dhuhr') ? "Jumua" : vakits[i].name,
                "time12": format12(vakits[i].time),
                "time24": (vakits[i].time),
                "isCurrentVakit": vakits[i].isCurrentVakit()
            }
        }
        this.appSettings.appVakits = appVakits;

        return this;
    },
    updateIcon(canvas, r) {
        canvas.save();
        canvas.translate(canvas.canvas.width * 0.5, canvas.canvas.height * 0.5);
        this.fillCircle(canvas, r * 1.5, 0, 0, this.iconColor);

        if (this.aroundTheClock) {
            this.drawArc(canvas, 0, 2 * Math.PI + Math.PI / 40, r * 1.05, r / 3, this.iconTextColor);
            this.drawHand(canvas, this.nextVakit.startAngle12(), r * 0.9, r * 1.13, r / 4, this.iconColor);
        }
        else {
            this.drawArc(canvas, this.currentVakit.startAngle12(), this.currentVakit.endAngle12(), r * 1.05, r / 3, this.iconTextColor);
        }

        this.drawArrow(canvas, hoursToRadians(hours12(this.currentTime.getHours()) * 60 + this.currentTime.getMinutes()), 0, r * 0.21, r * 0.81, this.iconTextColor);
        this.fillCircle(canvas, r * 0.19, 0, 0, this.iconTextColor);
        canvas.restore();
        return this;
    },
    updateBar(canvas, r) {

        let barColor = this.iconColor;

        if (this.appSettings.isLastHour && this.appSettings.lastHourHilite == 1) {
            barColor = this.colors.tomato;
        }

        let iWidth = 38;
        let iHeight = 16;
        let borderPadding = 1.8;
        let actualWidth = iWidth - 2 * borderPadding;
        let actualHeight = iHeight - 2 * borderPadding;

        let remainingWidth = this.remainingMinutesInVakit * (actualWidth - 2 * borderPadding) / this.totalMinutesInVakit;

        if (remainingWidth < 4)
            remainingWidth = 4;

        canvas.save();
        canvas.beginPath();
        canvas.rect(0, 0, iWidth, iHeight);
        canvas.fillStyle = this.colors.silver;
        canvas.fill();
        canvas.restore();

        canvas.save();
        canvas.beginPath();
        canvas.rect(borderPadding, borderPadding, actualWidth, actualHeight);
        canvas.fillStyle = this.colors.gray;

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
        this.print(canvas, this.currentVakit.nextVakitIn(), r * 1.1, this.colors.silver, r * 0.85);
        canvas.restore();
        return this;
    },
    updateClock(canvas, r) {
        canvas.save();
        let arcLineWidth = r / 15;
        canvas.translate(canvas.canvas.width * 0.5, canvas.canvas.height * 0.5);

        if (this.aroundTheClock) {
            this.drawArc(canvas, 0, 2 * Math.PI + Math.PI / 40, r * 1.19, arcLineWidth, this.colors.silver);
            this.drawHand(canvas, this.nextVakit.startAngle12(), r * 1.15, r * 1.22, arcLineWidth / 1.7, this.colors.gray);
        }
        else {
            this.drawArc(canvas, this.currentVakit.startAngle12(), this.currentVakit.endAngle12(), r * 1.19, arcLineWidth, this.colors.silver);
        }

        if (this.currentVakit.name === 'Isha' || this.currentVakit.name === 'Midnight') {

            let fractionTextSize = r * 0.13;
            let totalMinutesInIsha = diffMinutesBetweenTimes(this.getPrayerTime('maghrib'), this.getPrayerTime('fajr'));
            let oneThird = totalMinutesInIsha / 3;
            let twoThird = oneThird * 2;

            if (this.appSettings.showMidnight === 0) {
                let midnightRadians = timeToRadians(this.getPrayerTime('midnight'), 12);
                this.drawHand(canvas, midnightRadians, r * 1.15, r * 1.22, arcLineWidth / 1.7, this.colors.gray);
                this.printAt(canvas, '1/2', fractionTextSize, this.colors.silver, r, midnightRadians);
            }

            if (this.appSettings.showMidnight === 0 || this.currentVakit.name === 'Isha') {
                let oneThirdRadians = timeToRadians(this.getPrayerTime('maghrib'), 12) + oneThird * 2 * Math.PI / 720;
                this.drawHand(canvas, oneThirdRadians, r * 1.15, r * 1.22, arcLineWidth / 1.7, this.colors.gray);
                this.printAt(canvas, '1/3', fractionTextSize, this.colors.silver, r, oneThirdRadians);
            }

            if (this.appSettings.showMidnight === 0 || this.currentVakit.name === 'Midnight') {
                let twoThirdRadians = timeToRadians(this.getPrayerTime('maghrib'), 12) + twoThird * 2 * Math.PI / 720;
                this.drawHand(canvas, twoThirdRadians, r * 1.15, r * 1.22, arcLineWidth / 1.7, this.colors.gray);
                this.printAt(canvas, '2/3', fractionTextSize, this.colors.silver, r, twoThirdRadians);
            }

        }

        let hourRadians = hoursToRadians(hours12(this.currentTime.getHours()) * 60 + this.currentTime.getMinutes());
        let minuteRadians = minutesToRadians(this.currentTime.getMinutes());
        let secondRadians = secondsToRadians(this.currentTime.getSeconds());

        this.drawHand(canvas, hourRadians, -r * 0.05, r * 0.7, arcLineWidth, this.colors.silver);
        this.drawHand(canvas, minuteRadians, -r * 0.05, r * 1.05, arcLineWidth, this.colors.silver);
        this.drawHand(canvas, secondRadians, -r * 0.1, r * 1.1, arcLineWidth / 4, this.colors.silver);

        this.fillCircle(canvas, r * 0.02, 0, 0, this.colors.gray);
        this.drawNumbers12(canvas, r * 1.01, this.colors.silver);

        if (this.clockFaceVakit) {

            let topHands = handOnTop(hourRadians) || handOnTop(minuteRadians);
            let bottomHands = handOnBottom(hourRadians) || handOnBottom(minuteRadians);

            if (topHands && !bottomHands)
                this.print(canvas, this.clockFaceVakit, 27, this.colors.silver, r * 0.5);
            else
                this.print(canvas, this.clockFaceVakit, 27, this.colors.silver, -r * 0.5);

        }

        canvas.restore();

        return this;
    },
    extensionOps() {

        let isRamadan = false;
        let enHijriDate = new Intl.DateTimeFormat('en', { calendar: 'islamic-umalqura', day: 'numeric', month: 'long', year: 'numeric' }).format(this.hijriCurrentTime);
        if (enHijriDate.indexOf('Ramadan') >= 0)
            isRamadan = true;

        let elapsedText = this.appSettings.i18n.elapsedTimeTitle + ' ' + diffBetweenTimes(this.currentVakit.time, this.currentTimeString);


        let nextText = this.currentVakit.nextVakitIn();
        let nextTextTitle = this.appSettings.i18n.nextTextTitle;

        if (isRamadan && this.currentVakit.name === 'Asr')
            nextTextTitle = this.appSettings.i18n.remainingForIftarTitle;

        if (this.currentTimeString === this.currentVakit.time) {
            nextTextTitle = this.appSettings.i18n.azanTimeTitle;
            if (this.currentVakit.name === 'Imsak' || this.currentVakit.name === 'Sunrise' || this.currentVakit.name === 'Midnight')
                nextTextTitle = '&nbsp;';
            nextText = this.appSettings.i18n[this.currentVakit.name.toLowerCase() + 'Text'];
        }

        if (nextText.length < 4)
            nextText = ' ' + nextText + ' ';

        this.appSettings.iconColor = this.iconColor;
        this.appSettings.iconTextColor = this.iconTextColor;
        this.appSettings.todaysDate = new Date().toLocaleString((this.appSettings.i18n.languageCode ?? navigator.language), { timeZone: this.appSettings.timeZoneID, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        this.appSettings.todaysDateArabic = this.hijriDate;

        if (this.currentTimeString === this.currentVakit.time && this.appSettings.desktopNotifications === 1) {

            chrome.storage.local.get(['lastAlert'], (result) => {

                let lastAlertString = this.currentVakit.name + (new Date().toLocaleString("en-US", { day: 'numeric', month: 'numeric', year: 'numeric' })).replaceAll('/', '-');

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
                            message: this.appSettings.address
                        }
                    );
                }

            });
        }

        if (this.currentVakit.name === "Sunrise") {
            let toText = " -> " + this.appSettings.i18n.dhuhrText;
            if (this.currentTime.getDay() === 5)
                toText = " -> " + this.appSettings.i18n.jumuaText;
            chrome.action.setTitle({ title: nextTextTitle + ' ' + nextText + toText });

        }
        else {
            chrome.action.setTitle({ title: (this.clockFaceVakit ? '[' + this.clockFaceVakit + '] ' : '') + nextTextTitle + ' ' + nextText + ' -> ' + this.appSettings.i18n[this.nextVakit.name.toLowerCase() + 'Text'] });
        }

        chrome.action.setBadgeText({ 'text': '' });

        if (this.appSettings.iconStyle === "badge") {
            chrome.action.setBadgeText({ 'text': nextText });
            chrome.action.setBadgeBackgroundColor({ 'color': this.badgeBackgroundColor });
            chrome.action.setIcon({ imageData: { "38": this.btx.getImageData(0, 0, 38, 38) } });
        }
        else {
            chrome.action.setIcon({ imageData: { "38": this.itx.getImageData(0, 0, 38, 38) } });
        }

        this.appSettings.nextText = nextText;
        this.appSettings.nextTextTitle = nextTextTitle;

        this.appSettings.elapsedText = elapsedText;

        this.appSettings.iconStyle = this.appSettings.iconStyle ?? "badge";

        this.appSettings.remainingForIftar = null;
        if (isRamadan && this.currentVakit.name !== 'Asr' && this.currentVakit.name !== 'Maghrib' && this.currentVakit.name !== 'Isha' && this.currentVakit.name !== 'Midnight')
            this.appSettings.remainingForIftar = this.appSettings.i18n.remainingForIftarTitle + ' ' + diffBetweenTimes(this.currentTimeString, this.getPrayerTime('maghrib'));

        this.itx.canvas.convertToBlob().then((blob) => {
            let reader1 = new FileReader();
            reader1.readAsDataURL(blob);
            reader1.onloadend = () => {

                this.appSettings.icon = reader1.result;

                this.btx.canvas.convertToBlob().then((blob) => {
                    let reader2 = new FileReader();
                    reader2.readAsDataURL(blob);
                    reader2.onloadend = () => {
                        this.appSettings.bar = reader2.result;
                        this.ctx.canvas.convertToBlob().then((blob) => {
                            let reader3 = new FileReader();
                            reader3.readAsDataURL(blob);
                            reader3.onloadend = () => {

                                this.appSettings.clock = reader3.result;
                                this.appSettings.lastRun = new Date().getTime();

                                chrome.storage.local.set({ 'appSettings': this.appSettings }, function () {
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

    },
    getPrayerTime(vakit) { return this.prayerTimes[vakit].replace(/^0/, ''); },
    print(canvas, text, size, color, y) {
        canvas.save();
        if (!y)
            y = 0;
        canvas.font = 'bold ' + Math.floor(size) + 'px Arial';
        canvas.fillStyle = color;
        canvas.textBaseline = "middle";
        canvas.textAlign = 'center';
        canvas.fillText(text, 0, y);
        canvas.restore();
    },
    printAt(canvas, text, size, color, r, angle) {
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

    },
    drawArc(canvas, startAngle, endAngle, radius, lineWidth, color) {
        canvas.save();
        canvas.beginPath();
        canvas.arc(0, 0, radius, startAngle, endAngle, false);
        canvas.lineWidth = lineWidth;
        canvas.lineCap = "butt";
        canvas.strokeStyle = color;
        canvas.stroke();
        canvas.restore();
    },
    drawNumbers12(canvas, r, color) {
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
    },
    fillCircle(canvas, r, x, y, color) {
        canvas.save();
        canvas.beginPath();
        canvas.arc(x, y, r, 0, Math.PI * 2);
        canvas.fillStyle = color;
        canvas.fill();
        canvas.restore();
    },
    drawHand(canvas, angle, from, to, lineWidth, color) {
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
    },
    drawArrow(canvas, angle, x, width, height, color) {
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
};

const goRun = (info) => {
    SmartAzanClock.run(info)
}
